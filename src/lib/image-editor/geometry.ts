import type { CropAspectId, NormRect, QuarterTurn } from "./types";

const MIN_SPAN = 0.05;

export type CropHandle =
  | "move"
  | "n"
  | "s"
  | "e"
  | "w"
  | "nw"
  | "ne"
  | "sw"
  | "se";

export function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function clampRect(rect: NormRect, min = MIN_SPAN): NormRect {
  const w = Math.min(1, Math.max(min, rect.w));
  const h = Math.min(1, Math.max(min, rect.h));
  const x = Math.min(Math.max(0, rect.x), 1 - w);
  const y = Math.min(Math.max(0, rect.y), 1 - h);
  return { x, y, w, h };
}

/** Seitenverhältnis der transformierten Bildfläche (Breite / Höhe). */
export function orientedAspect(
  width: number,
  height: number,
  rotation: QuarterTurn
): number {
  if (width <= 0 || height <= 0) return 1;
  const turned = rotation % 180 !== 0;
  return turned ? height / width : width / height;
}

export function pixelAspectFor(
  id: CropAspectId,
  imageAspect: number
): number | null {
  switch (id) {
    case "free":
      return null;
    case "original":
      return imageAspect > 0 ? imageAspect : 1;
    case "square":
      return 1;
    case "wide":
      return 16 / 9;
    case "classic":
      return 4 / 3;
    default:
      return null;
  }
}

/**
 * Größtes zentriertes Rechteck mit dem gewünschten Pixel-Seitenverhältnis.
 * `pixelAspect === null` liefert das volle Bild (Freiform-Start).
 */
export function fitCrop(
  imageAspect: number,
  pixelAspect: number | null
): NormRect {
  if (
    pixelAspect == null ||
    !Number.isFinite(pixelAspect) ||
    pixelAspect <= 0 ||
    !Number.isFinite(imageAspect) ||
    imageAspect <= 0
  ) {
    return { x: 0, y: 0, w: 1, h: 1 };
  }
  const normRatio = pixelAspect / imageAspect;
  let w = 1;
  let h = w / normRatio;
  if (h > 1) {
    h = 1;
    w = h * normRatio;
  }
  if (w > 1) {
    w = 1;
    h = w / normRatio;
  }
  return {
    x: (1 - w) / 2,
    y: (1 - h) / 2,
    w,
    h,
  };
}

export function normRatioFor(
  pixelAspect: number | null,
  imageAspect: number
): number | null {
  if (pixelAspect == null || imageAspect <= 0) return null;
  return pixelAspect / imageAspect;
}

export function pixelAspectOf(rect: NormRect, imageAspect: number): number {
  if (rect.h <= 0) return imageAspect;
  return (rect.w / rect.h) * imageAspect;
}

export function cropPixels(
  rect: NormRect,
  width: number,
  height: number
): { x: number; y: number; w: number; h: number } {
  const safe = clampRect(rect, 0.001);
  const x = Math.max(0, Math.min(width - 1, Math.round(safe.x * width)));
  const y = Math.max(0, Math.min(height - 1, Math.round(safe.y * height)));
  const w = Math.max(1, Math.min(width - x, Math.round(safe.w * width)));
  const h = Math.max(1, Math.min(height - y, Math.round(safe.h * height)));
  return { x, y, w, h };
}

/** Zielrechteck, in das ein Ausschnitt zentriert in ein Quadrat gelegt wird. */
export function squarePlacement(
  cropW: number,
  cropH: number,
  size: number
): { dx: number; dy: number; dw: number; dh: number } {
  const scale = Math.min(size / Math.max(1, cropW), size / Math.max(1, cropH));
  const dw = Math.max(1, Math.round(cropW * scale));
  const dh = Math.max(1, Math.round(cropH * scale));
  const dx = Math.round((size - dw) / 2);
  const dy = Math.round((size - dh) / 2);
  return { dx, dy, dw, dh };
}

/** Bounding-Box nach einer beliebigen Drehung (90°-Schritte plus Wasserwaage). */
export function straightenedOutputSize(
  srcW: number,
  srcH: number,
  degrees: number,
  maxEdge: number
): { width: number; height: number; srcDrawW: number; srcDrawH: number } {
  const scale = maxEdge / Math.max(1, srcW, srcH);
  const srcDrawW = srcW * scale;
  const srcDrawH = srcH * scale;
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  return {
    width: Math.max(1, Math.round(srcDrawW * cos + srcDrawH * sin)),
    height: Math.max(1, Math.round(srcDrawW * sin + srcDrawH * cos)),
    srcDrawW,
    srcDrawH,
  };
}

export function transformedOutputSize(
  srcW: number,
  srcH: number,
  rotation: QuarterTurn,
  maxEdge: number
): { width: number; height: number; srcDrawW: number; srcDrawH: number } {
  const turned = rotation % 180 !== 0;
  const boundsW = turned ? srcH : srcW;
  const boundsH = turned ? srcW : srcH;
  const longest = Math.max(boundsW, boundsH, 1);
  const scale = Math.min(1, maxEdge / longest);
  const srcDrawW = Math.max(1, Math.round(srcW * scale));
  const srcDrawH = Math.max(1, Math.round(srcH * scale));
  return {
    width: turned ? srcDrawH : srcDrawW,
    height: turned ? srcDrawW : srcDrawH,
    srcDrawW,
    srcDrawH,
  };
}

function sides(handle: CropHandle) {
  return {
    west: handle === "w" || handle === "nw" || handle === "sw",
    east: handle === "e" || handle === "ne" || handle === "se",
    north: handle === "n" || handle === "nw" || handle === "ne",
    south: handle === "s" || handle === "sw" || handle === "se",
  };
}

/**
 * Verschiebt oder skaliert den Ausschnitt.
 * `normRatio` ist w/h in normalisierten Einheiten (Pixel-Seitenverhältnis / Bild-Seitenverhältnis).
 */
export function resizeCrop(
  start: NormRect,
  handle: CropHandle,
  dx: number,
  dy: number,
  normRatio: number | null
): NormRect {
  if (handle === "move") {
    return clampRect({ ...start, x: start.x + dx, y: start.y + dy });
  }

  const { west, east, north, south } = sides(handle);
  let left = start.x;
  let top = start.y;
  let right = start.x + start.w;
  let bottom = start.y + start.h;

  if (west) left += dx;
  if (east) right += dx;
  if (north) top += dy;
  if (south) bottom += dy;

  let w = right - left;
  let h = bottom - top;

  if (normRatio != null && normRatio > 0) {
    const corner = (east || west) && (north || south);
    if (corner) {
      if (Math.abs(dx) >= Math.abs(dy)) h = w / normRatio;
      else w = h * normRatio;
    } else if (east || west) {
      h = w / normRatio;
    } else {
      w = h * normRatio;
    }
    if (w < MIN_SPAN) {
      w = MIN_SPAN;
      h = w / normRatio;
    }
    if (h < MIN_SPAN) {
      h = MIN_SPAN;
      w = h * normRatio;
    }
    if (w > 1 || h > 1) {
      const fit = Math.min(1 / w, 1 / h);
      w *= fit;
      h *= fit;
    }
  } else {
    w = Math.max(MIN_SPAN, w);
    h = Math.max(MIN_SPAN, h);
  }

  if (west && !east) left = right - w;
  else if (east && !west) right = left + w;
  else {
    const cx = start.x + start.w / 2;
    left = cx - w / 2;
    right = left + w;
  }

  if (north && !south) top = bottom - h;
  else if (south && !north) bottom = top + h;
  else {
    const cy = start.y + start.h / 2;
    top = cy - h / 2;
    bottom = top + h;
  }

  if (left < 0) {
    right -= left;
    left = 0;
  }
  if (top < 0) {
    bottom -= top;
    top = 0;
  }
  if (right > 1) {
    left -= right - 1;
    right = 1;
  }
  if (bottom > 1) {
    top -= bottom - 1;
    bottom = 1;
  }

  w = right - left;
  h = bottom - top;
  if (left < 0) left = 0;
  if (top < 0) top = 0;
  if (w > 1) w = 1;
  if (h > 1) h = 1;
  if (left + w > 1) left = 1 - w;
  if (top + h > 1) top = 1 - h;

  return clampRect({ x: left, y: top, w, h }, MIN_SPAN);
}
