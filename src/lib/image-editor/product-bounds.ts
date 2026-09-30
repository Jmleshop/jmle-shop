import { MAX_EDGE_PRODUCT } from "@/lib/image-bounds";
import { squarePlacement } from "./geometry";

/**
 * Längste Motiv-Seite füllt diesen Anteil des Quadrats.
 * ~6 % Padding pro Seite → nah/groß auf Karten, ohne Clipping.
 */
export const PRODUCT_FILL = 0.88;

/** Trim: Alpha/Near-transparent + helles Studio-Weiß. */
export const TRIM_THRESHOLD = 12;

/** Extra Rand um die Bounding-Box (relativ zur Motivbox, nicht Canvas). */
export const BOUNDS_EXPAND_RATIO = 0.02;

/**
 * Studio-Matte außerhalb des Produkts (Weiß/Cream/Grau).
 * Farblogos und Verpackungsfarben bleiben Vordergrund.
 */
export function isBackdropPixel(r: number, g: number, b: number, a: number): boolean {
  if (a < 24) return true;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  if (min >= 248 && chroma <= 10) return true;
  if (a < 200 && min >= 230 && chroma <= 28) return true;
  if (a < 160 && min >= 210 && chroma <= 20) return true;
  return false;
}

export type PixelBox = { x: number; y: number; w: number; h: number };

/** Expandiert eine Box um ratio der Bildkanten, geklemmt an Canvas. */
export function expandPixelBox(
  box: PixelBox,
  width: number,
  height: number,
  ratio = BOUNDS_EXPAND_RATIO
): PixelBox {
  const padX = Math.max(2, Math.round(width * ratio));
  const padY = Math.max(2, Math.round(height * ratio));
  const x = Math.max(0, box.x - padX);
  const y = Math.max(0, box.y - padY);
  const right = Math.min(width, box.x + box.w + padX);
  const bottom = Math.min(height, box.y + box.h + padY);
  return { x, y, w: Math.max(1, right - x), h: Math.max(1, bottom - y) };
}

function pixelIsWhite(data: ArrayLike<number>, index: number, channels: number): boolean {
  const alpha = channels >= 4 ? data[index + 3] : 255;
  if (alpha < 8) return true;
  return (
    Math.abs(data[index] - 255) <= TRIM_THRESHOLD &&
    Math.abs(data[index + 1] - 255) <= TRIM_THRESHOLD &&
    Math.abs(data[index + 2] - 255) <= TRIM_THRESHOLD
  );
}

/** Edge trim gegen reines Weiß / Transparenz. */
export function trimWhiteEdges(
  data: ArrayLike<number>,
  width: number,
  height: number,
  channels = 4
): PixelBox | null {
  const rowEmpty = (y: number) => {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if (!pixelIsWhite(data, (row + x) * channels, channels)) return false;
    }
    return true;
  };
  const colEmpty = (x: number, top: number, bottom: number) => {
    for (let y = top; y <= bottom; y++) {
      if (!pixelIsWhite(data, (y * width + x) * channels, channels)) return false;
    }
    return true;
  };

  let top = 0;
  while (top < height && rowEmpty(top)) top += 1;
  if (top >= height) return null;
  let bottom = height - 1;
  while (bottom > top && rowEmpty(bottom)) bottom -= 1;
  let left = 0;
  while (left < width && colEmpty(left, top, bottom)) left += 1;
  let right = width - 1;
  while (right > left && colEmpty(right, top, bottom)) right -= 1;
  const tight = { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
  return expandPixelBox(tight, width, height);
}

export function productPixelBounds(
  data: ArrayLike<number>,
  width: number,
  height: number,
  channels = 4
): PixelBox | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const i = (row + x) * channels;
      const alpha = channels >= 4 ? data[i + 3] : 255;
      if (isBackdropPixel(data[i], data[i + 1], data[i + 2], alpha)) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return expandPixelBox(
    { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
    width,
    height
  );
}

/** True when already a centered square near PRODUCT_FILL. */
export function alreadyFramed(box: PixelBox, width: number, height: number): boolean {
  const side = Math.max(width, height, 1);
  if (Math.abs(width - height) / side > 0.04) return false;
  const longest = Math.max(box.w, box.h) / side;
  const cx = (box.x + box.w / 2) / width;
  const cy = (box.y + box.h / 2) / height;
  return (
    longest >= PRODUCT_FILL - 0.04 &&
    longest <= PRODUCT_FILL + 0.06 &&
    Math.abs(cx - 0.5) < 0.04 &&
    Math.abs(cy - 0.5) < 0.04
  );
}

/** Reframe only when a real empty margin remains. */
export function shouldReframe(box: PixelBox, width: number, height: number): boolean {
  if (alreadyFramed(box, width, height)) return false;
  const empty = Math.max(
    box.x,
    box.y,
    width - (box.x + box.w),
    height - (box.y + box.h)
  );
  return empty / Math.max(1, Math.min(width, height)) > 0.07;
}

export function frameSquareSize(boxW: number, boxH: number): number {
  const longest = Math.max(boxW, boxH, 1);
  const needed = Math.round(longest / PRODUCT_FILL);
  // Storage-Cap — kein Upscale über MAX_EDGE_PRODUCT
  return Math.min(MAX_EDGE_PRODUCT, Math.max(longest, needed));
}

/** Zentriert das Motiv mit PRODUCT_FILL-Innenabstand im Quadrat. */
export function productFrame(boxW: number, boxH: number, canvas: number) {
  const inner = Math.max(1, Math.round(canvas * PRODUCT_FILL));
  const origin = Math.round((canvas - inner) / 2);
  const place = squarePlacement(boxW, boxH, inner);
  return {
    dx: place.dx + origin,
    dy: place.dy + origin,
    dw: place.dw,
    dh: place.dh,
  };
}
