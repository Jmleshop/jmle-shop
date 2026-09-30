/**
 * Post-Processing nach Freistellung:
 * Transparenz prüfen, transparente Ränder trimmen, 1:1 zentrieren (10 % Padding).
 */

export const CUTOUT_PADDING = 0.1; // 10 % Innenabstand → 80 % Produktfläche
export const CUTOUT_FILL = 1 - CUTOUT_PADDING * 2;

export type AlphaStats = {
  width: number;
  height: number;
  opaque: number;
  translucent: number;
  transparent: number;
  /** True wenn genug Alpha-Varianz für einen echten Freisteller */
  hasCutout: boolean;
};

function canvasFromBitmap(bitmap: ImageBitmap): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas nicht verfügbar");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  return { canvas, ctx };
}

export function analyzeAlpha(data: Uint8ClampedArray, width: number, height: number): AlphaStats {
  let opaque = 0;
  let translucent = 0;
  let transparent = 0;
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i];
    if (a < 16) transparent += 1;
    else if (a < 250) translucent += 1;
    else opaque += 1;
  }
  const total = Math.max(1, width * height);
  const nonOpaque = transparent + translucent;
  const solid = opaque + translucent;
  // Mindestens ~2 % Freisteller-Fläche und etwas deckendes Produkt (≥0.2 %)
  const hasCutout = nonOpaque / total >= 0.02 && solid / total >= 0.002;
  return { width, height, opaque, translucent, transparent, hasCutout };
}

export async function blobHasTransparency(blob: Blob): Promise<boolean> {
  const bitmap = await createImageBitmap(blob);
  try {
    const { ctx, canvas } = canvasFromBitmap(bitmap);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return analyzeAlpha(pixels.data, canvas.width, canvas.height).hasCutout;
  } finally {
    bitmap.close();
  }
}

export type PixelBox = { x: number; y: number; w: number; h: number };

/** Bounding-Box aller nicht-transparenten Pixel */
export function alphaBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  alphaCut = 16
): PixelBox | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const a = data[(row + x) * 4 + 3];
      if (a < alphaCut) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/**
 * Trimmt transparente Ränder und zentriert das Objekt auf einem 1:1-Canvas
 * mit elegantem 10 %-Innenabstand.
 */
export async function trimAndCenterCutout(
  blob: Blob,
  options?: { padding?: number; maxEdge?: number }
): Promise<Blob> {
  const padding = options?.padding ?? CUTOUT_PADDING;
  const maxEdge = options?.maxEdge ?? 1600;
  const fill = Math.max(0.5, Math.min(0.95, 1 - padding * 2));

  const bitmap = await createImageBitmap(blob);
  try {
    const { ctx, canvas } = canvasFromBitmap(bitmap);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const box = alphaBounds(pixels.data, canvas.width, canvas.height);
    if (!box) {
      // Nichts Sichtbares — Original zurück
      return blob;
    }

    const longest = Math.max(box.w, box.h, 1);
    const side = Math.min(maxEdge, Math.max(256, Math.round(longest / fill)));
    const inner = Math.max(1, Math.round(side * fill));
    const scale = Math.min(inner / box.w, inner / box.h);
    const dw = Math.max(1, Math.round(box.w * scale));
    const dh = Math.max(1, Math.round(box.h * scale));
    const dx = Math.round((side - dw) / 2);
    const dy = Math.round((side - dh) / 2);

    const out = document.createElement("canvas");
    out.width = side;
    out.height = side;
    const outCtx = out.getContext("2d");
    if (!outCtx) throw new Error("Canvas nicht verfügbar");
    outCtx.clearRect(0, 0, side, side);
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = "high";
    outCtx.drawImage(canvas, box.x, box.y, box.w, box.h, dx, dy, dw, dh);

    const result = await new Promise<Blob | null>((resolve) =>
      out.toBlob(resolve, "image/png")
    );
    if (!result) throw new Error("PNG-Export fehlgeschlagen");
    return result;
  } finally {
    bitmap.close();
  }
}
