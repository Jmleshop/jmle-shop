/**
 * Post-Processing nach manueller Freistellung:
 * Maske reparieren, Matte entfernen, Motiv mit Sicherheitsrand zentrieren.
 * Nie Ecken/Kanten abschneiden — großzügiges Padding, transparente Fläche.
 */

import {
  expandBoxByPixels,
  opaqueCoreBounds,
  repairCutoutMask,
} from "./cutout-mask-repair";

/**
 * ~14 % Innenabstand → ~72 % Motivfläche.
 * Bewusst großzügig, damit Verpackungskanten/Ecken nie abgeschnitten werden.
 */
export const CUTOUT_PADDING = 0.14;
export const CUTOUT_FILL = 1 - CUTOUT_PADDING * 2;
/** Produkt-Cutouts: 1000px reicht für Retina-Karten, spart Speicher. */
export const HD_MAX_EDGE = 1000;
/** Großzügiger Feather-Rand um die Silhouette (Pixel). */
export const CUTOUT_FEATHER_PX = 12;

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
 * Bounding-Box inkl. weicher Produktkanten + großzügigem Feather.
 * Niedriger alphaCut → Ecken/AA bleiben im Frame.
 */
export function alphaBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  alphaCut = 40,
  expand = true
): PixelBox | null {
  const tight = opaqueCoreBounds(data, width, height, alphaCut);
  if (!tight) return null;
  if (!expand) return tight;
  const pad = Math.max(
    CUTOUT_FEATHER_PX,
    Math.round(Math.max(tight.w, tight.h) * 0.06)
  );
  return expandBoxByPixels(tight, width, height, pad);
}

/**
 * Trimmt nur echte Transparenz und zentriert das unversehrte Motiv
 * auf einem transparenten Canvas — ohne festen Hintergrund/Kasten.
 */
export async function trimAndCenterCutout(
  blob: Blob,
  options?: { padding?: number; maxEdge?: number }
): Promise<Blob> {
  const padding = options?.padding ?? CUTOUT_PADDING;
  const maxEdge = options?.maxEdge ?? HD_MAX_EDGE;
  const fill = Math.max(0.5, Math.min(0.92, 1 - padding * 2));

  const bitmap = await createImageBitmap(blob);
  try {
    const { ctx, canvas } = canvasFromBitmap(bitmap);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Maske reparieren: zusammenhängendes Produkt, Studio-Matte draußen weg
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
    // 100 % transparent — kein Weiß/Cream/Grau-Kasten
    outCtx.clearRect(0, 0, side, side);
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = "high";
    outCtx.drawImage(canvas, box.x, box.y, box.w, box.h, dx, dy, dw, dh);

    // Nur voll transparente Pixel RGB nullen — keine weichen Produktkanten killen
    const outPixels = outCtx.getImageData(0, 0, side, side);
    for (let i = 0; i < outPixels.data.length; i += 4) {
      if (outPixels.data[i + 3] === 0) {
        outPixels.data[i] = 0;
        outPixels.data[i + 1] = 0;
        outPixels.data[i + 2] = 0;
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
