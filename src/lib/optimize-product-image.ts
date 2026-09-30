import sharp from "sharp";
import { PRODUCT_FILL, TRIM_THRESHOLD, productFrame } from "./image-editor/product-bounds";

export type OptimizeResult = {
  buffer: Buffer;
  contentType: "image/png" | "image/webp";
  width: number;
  height: number;
  removedBackground: boolean;
  reframed: boolean;
};

const MAX_EDGE = 2000;

/**
 * Server-Pipeline: Freisteller (optional) → Trim → 1:1-Zentrierung mit 10 % Padding.
 * Liefert immer ein HD-Ergebnis (PNG bei Transparenz, sonst WebP q95).
 */
export async function optimizeProductImageBuffer(
  input: Buffer,
  options?: { removeBackground?: boolean; force?: boolean }
): Promise<OptimizeResult> {
  const wantBg = options?.removeBackground !== false;
  let working = input;
  let removedBackground = false;

  if (wantBg) {
    try {
      const cut = await removeBackgroundNode(working);
      if (cut) {
        working = cut;
        removedBackground = true;
      }
    } catch (err) {
      console.warn("[optimize] bg-removal skipped:", err);
    }
  }

  const framed = await frameSquareCentered(working, { force: options?.force || removedBackground });
  const buffer = framed?.buffer ?? working;
  const meta = await sharp(buffer).metadata();
  const hasAlpha = Boolean(meta.hasAlpha) || removedBackground;

  // Nach Freisteller immer PNG mit Alpha — nie feste Hintergrundfarbe einbrennen.
  // Ohne Freisteller: Originalqualität (kein Upscale, hohe PNG/WebP-Qualität).
  if (hasAlpha || removedBackground) {
    const png = await sharp(buffer)
      .ensureAlpha()
      .resize(MAX_EDGE, MAX_EDGE, {
        fit: "inside",
        withoutEnlargement: true,
        kernel: "lanczos3",
      })
      .png({ compressionLevel: 6, adaptiveFiltering: true, effort: 7 })
      .toBuffer({ resolveWithObject: true });
    return {
      buffer: png.data,
      contentType: "image/png",
      width: png.info.width,
      height: png.info.height,
      removedBackground,
      reframed: Boolean(framed) || removedBackground,
    };
  }

  const webp = await sharp(buffer)
    .resize(MAX_EDGE, MAX_EDGE, {
      fit: "inside",
      withoutEnlargement: true,
      kernel: "lanczos3",
    })
    .webp({ quality: 100, alphaQuality: 100, nearLossless: true })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: webp.data,
    contentType: "image/webp",
    width: webp.info.width,
    height: webp.info.height,
    removedBackground,
    reframed: Boolean(framed),
  };
}

async function removeBackgroundNode(input: Buffer): Promise<Buffer | null> {
  const { removeBackground } = await import("@imgly/background-removal-node");
  const source = new Blob([new Uint8Array(input)], {
    type: sniffMime(input),
  });
  const blob = await removeBackground(source, {
    model: "small",
    output: { format: "image/png", quality: 1 },
  });
  const out = Buffer.from(await blob.arrayBuffer());
  // Sanity: muss Transparenz haben
  const { data, info } = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const total = Math.max(1, info.width * info.height);
  let nonOpaque = 0;
  let solid = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) nonOpaque += 1;
    else solid += 1;
  }
  if (nonOpaque / total < 0.02 || solid / total < 0.002) return null;
  return out;
}

function sniffMime(buf: Buffer): string {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return "image/png";
}

/**
 * Trim (weiß/transparent) + 1:1-Zentrierung mit PRODUCT_FILL (~12 % Padding).
 * Nach Sharp-Trim wird ein Sicherheitsrand wieder hinzugefügt, damit
 * weiche Kanten / Verpackungsränder nicht verloren gehen.
 */
export async function frameSquareCentered(
  input: Buffer,
  options?: { force?: boolean }
): Promise<{ buffer: Buffer } | null> {
  const base = sharp(input, { failOn: "none" }).rotate();
  const meta = await base.metadata();
  const beforeW = meta.width ?? 0;
  const beforeH = meta.height ?? 0;
  if (!beforeW || !beforeH) return null;

  const hasAlpha = Boolean(meta.hasAlpha);
  let trimmed: { data: Buffer; info: { width: number; height: number } };
  try {
    if (hasAlpha) {
      trimmed = await base
        .clone()
        .trim({
          background: { r: 0, g: 0, b: 0, alpha: 0 },
          threshold: TRIM_THRESHOLD,
        })
        .toBuffer({ resolveWithObject: true });
    } else {
      trimmed = await base
        .clone()
        .trim({ background: "#ffffff", threshold: TRIM_THRESHOLD })
        .toBuffer({ resolveWithObject: true });
    }
  } catch {
    trimmed = {
      data: await base.png().toBuffer(),
      info: { width: beforeW, height: beforeH },
    };
  }

  // Sicherheitsrand: ~4 % der getrimmten Kante wiederherstellen
  const padX = Math.max(2, Math.round(trimmed.info.width * 0.04));
  const padY = Math.max(2, Math.round(trimmed.info.height * 0.04));
  const paddedW = trimmed.info.width + padX * 2;
  const paddedH = trimmed.info.height + padY * 2;
  // Immer transparente Fläche — niemals Weiß/Creme einbrennen
  const padded = await sharp({
    create: {
      width: paddedW,
      height: paddedH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: hasAlpha
          ? trimmed.data
          : await sharp(trimmed.data).ensureAlpha().png().toBuffer(),
        left: padX,
        top: padY,
      },
    ])
    .png()
    .toBuffer({ resolveWithObject: true });

  const tw = padded.info.width;
  const th = padded.info.height;
  if (!options?.force) {
    const removedW = beforeW - tw;
    const removedH = beforeH - th;
    const alreadySquare = Math.abs(beforeW - beforeH) / Math.max(beforeW, beforeH) < 0.04;
    const alreadyTight =
      removedW < beforeW * 0.04 && removedH < beforeH * 0.04 && alreadySquare;
    if (alreadyTight) {
      const longest = Math.max(tw, th, 1);
      const fillRatio = longest / Math.max(beforeW, beforeH);
      if (fillRatio >= PRODUCT_FILL - 0.03 && fillRatio <= PRODUCT_FILL + 0.03) {
        return null;
      }
    }
  }

  const longest = Math.max(tw, th, 1);
  const size = Math.min(MAX_EDGE, Math.max(longest, Math.round(longest / PRODUCT_FILL)));
  const place = productFrame(tw, th, size);
  const resized = await sharp(padded.data)
    .resize(place.dw, place.dh, { fit: "fill", kernel: "lanczos3" })
    .toBuffer();

  const buffer = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: await sharp(resized).ensureAlpha().png().toBuffer(),
        left: place.dx,
        top: place.dy,
      },
    ])
    .png()
    .toBuffer();

  return { buffer };
}
