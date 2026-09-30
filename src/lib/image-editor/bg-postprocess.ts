/**
 * Post-Processing nach Freistellung:
 * Maske reparieren (ein zusammenhängendes Produkt), Matte entfernen,
 * Motiv zentriert auf transparentem 1:1-Canvas — ohne Kasten.
 */

import {
  expandBoxByPixels,
  opaqueCoreBounds,
  repairCutoutMask,
} from "./cutout-mask-repair";

/** ~8 % Innenabstand → ~84 % Motivfläche (enger, kein „Karten“-Rahmen). */
export const CUTOUT_PADDING = 0.08;
export const CUTOUT_FILL = 1 - CUTOUT_PADDING * 2;
/** Produkt-Cutouts: 1000px reicht für Retina-Karten, spart Speicher. */
export const HD_MAX_EDGE = 1000;
/** Fester Feather-Rand um die Kern-Silhouette (Pixel). */
export const CUTOUT_FEATHER_PX = 4;

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

/**
 * Bounding-Box der deckenden Silhouette inkl. kleinem Feather.
 * Nach Masken-Reparatur: keine Soft-Matte-Ausdehnung mehr.
 */
export function alphaBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  alphaCut = 128,
  expand = true
): PixelBox | null {
  const tight = opaqueCoreBounds(data, width, height, alphaCut);
  if (!tight) return null;
  if (!expand) return tight;
  // Feather relativ zur Motivgröße — nicht zur vollen Canvas-Kante
  const pad = Math.max(
    CUTOUT_FEATHER_PX,
    Math.round(Math.max(tight.w, tight.h) * 0.02)
  );
  return expandBoxByPixels(tight, width, height, pad);
}

/**
 * Trimmt transparente Ränder und zentriert das unversehrte Motiv
 * auf einem transparenten HD-1:1-Canvas — ohne festen Hintergrund.
 */
export async function trimAndCenterCutout(
  blob: Blob,
  options?: { padding?: number; maxEdge?: number }
): Promise<Blob> {
  const padding = options?.padding ?? CUTOUT_PADDING;
  const maxEdge = options?.maxEdge ?? HD_MAX_EDGE;
  const fill = Math.max(0.5, Math.min(0.95, 1 - padding * 2));

  const bitmap = await createImageBitmap(blob);
  try {
    const { ctx, canvas } = canvasFromBitmap(bitmap);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // 1) Maske reparieren: ein zusammenhängendes Produkt, keine Matte
    repairCutoutMask(pixels.data, canvas.width, canvas.height);
    ctx.putImageData(pixels, 0, 0);

    const box = alphaBounds(pixels.data, canvas.width, canvas.height);
    if (!box) {
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
    // 100 % transparent — kein Weiß/Cream/Grau
    outCtx.clearRect(0, 0, side, side);
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = "high";
    outCtx.drawImage(canvas, box.x, box.y, box.w, box.h, dx, dy, dw, dh);

    // Nach dem Scale nochmals Matte-Reste an weichen Kanten killen
    const outPixels = outCtx.getImageData(0, 0, side, side);
    for (let i = 0; i < outPixels.data.length; i += 4) {
      const a = outPixels.data[i + 3];
      if (a === 0) {
        outPixels.data[i] = 0;
        outPixels.data[i + 1] = 0;
        outPixels.data[i + 2] = 0;
      } else if (a < 24) {
        outPixels.data[i] = 0;
        outPixels.data[i + 1] = 0;
        outPixels.data[i + 2] = 0;
        outPixels.data[i + 3] = 0;
      }
    }
    outCtx.putImageData(outPixels, 0, 0);

    const result = await new Promise<Blob | null>((resolve) =>
      out.toBlob(resolve, "image/png")
    );
    if (!result) throw new Error("PNG-Export fehlgeschlagen");
    return result;
  } finally {
    bitmap.close();
  }
}
