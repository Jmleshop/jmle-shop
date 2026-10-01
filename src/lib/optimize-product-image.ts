import sharp from "sharp";
import { MAX_EDGE_PRODUCT, STORAGE_WEBP_QUALITY_PCT } from "./image-bounds";
import { PRODUCT_FILL, TRIM_THRESHOLD, productFrame } from "./image-editor/product-bounds";
import { repairCutoutMask } from "./image-editor/cutout-mask-repair";

export type OptimizeResult = {
  buffer: Buffer;
  contentType: "image/webp";
  width: number;
  height: number;
  removedBackground: boolean;
  reframed: boolean;
};

/**
 * Server-Pipeline: Freisteller → Masken-Reparatur → Trim → 1:1 → WebP q90.
 * - Transparenter Alpha-Kanal (keine festen Hintergründe / Kästen)
 * - Produkt bleibt ein zusammenhängendes Objekt
 * - EXIF/ICC entfernt
 */
export async function optimizeProductImageBuffer(
  input: Buffer,
  options?: { removeBackground?: boolean; force?: boolean; maxEdge?: number }
): Promise<OptimizeResult> {
  const maxEdge = options?.maxEdge ?? MAX_EDGE_PRODUCT;
  // Default: KEIN Auto-Freisteller — nur explizit per removeBackground: true
  const wantBg = options?.removeBackground === true;
  let working = input;
  let removedBackground = false;

  if (wantBg) {
    try {
      const cut = await removeBackgroundNode(working);
      if (cut) {
        working = await repairCutoutBuffer(cut);
        removedBackground = true;
      }
    } catch (err) {
      console.warn("[optimize] bg-removal skipped:", err);
    }
  }

  const framed = await frameSquareCentered(working, {
    force: options?.force || removedBackground,
    maxEdge,
  });
  const buffer = framed?.buffer ?? working;

  // Immer WebP q90 — Alpha bleibt erhalten, Metadaten werden verworfen
  const webp = await sharp(buffer)
    .rotate()
    .ensureAlpha()
    .resize(maxEdge, maxEdge, {
      fit: "inside",
      withoutEnlargement: true,
      kernel: "lanczos3",
    })
    .webp({
      quality: STORAGE_WEBP_QUALITY_PCT,
      alphaQuality: 90,
      effort: 4,
      smartSubsample: true,
    })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: webp.data,
    contentType: "image/webp",
    width: webp.info.width,
    height: webp.info.height,
    removedBackground,
    reframed: Boolean(framed) || removedBackground,
  };
}

/** Remote HF inference only — never ship onnxruntime-node into Vercel functions. */
async function removeBackgroundNode(input: Buffer): Promise<Buffer | null> {
  const {
    huggingfaceToken,
    removeBackgroundViaHuggingFace,
  } = await import("@/lib/server-remove-background");
  const token = huggingfaceToken();
  if (!token) {
    console.warn(
      "[optimize] skip server bg-removal: set HF_TOKEN (no local ONNX on Vercel)"
    );
    return null;
  }
  void sniffMime(input);
  return removeBackgroundViaHuggingFace(input, token);
}

/** Masken-Reparatur auf Sharp-PNG: Löcher schließen, Matte killen. */
async function repairCutoutBuffer(input: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
  repairCutoutMask(pixels, info.width, info.height);
  return sharp(Buffer.from(pixels), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
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
 * Trim + 1:1-Zentrierung auf transparentem Canvas.
 * Zwischenbuffer PNG (verlustfrei), finales Encoding macht der Caller als WebP.
 */
export async function frameSquareCentered(
  input: Buffer,
  options?: { force?: boolean; maxEdge?: number }
): Promise<{ buffer: Buffer } | null> {
  const maxEdge = options?.maxEdge ?? MAX_EDGE_PRODUCT;
  const base = sharp(input, { failOn: "none" }).rotate();
  const meta = await base.metadata();
  const beforeW = meta.width ?? 0;
  const beforeH = meta.height ?? 0;
  if (!beforeW || !beforeH) return null;

  const hasAlpha = Boolean(meta.hasAlpha);
  let trimmed: { data: Buffer; info: { width: number; height: number } };
  try {
    if (hasAlpha) {
      // Nur transparente Ränder trimmen — kein Weiß-Trim auf Freistellern
      trimmed = await base
        .clone()
        .ensureAlpha()
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

  const padX = Math.max(2, Math.round(trimmed.info.width * 0.02));
  const padY = Math.max(2, Math.round(trimmed.info.height * 0.02));
  const paddedW = trimmed.info.width + padX * 2;
  const paddedH = trimmed.info.height + padY * 2;
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
  const size = Math.min(maxEdge, Math.max(longest, Math.round(longest / PRODUCT_FILL)));
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
