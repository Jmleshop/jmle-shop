import { squarePlacement } from "./geometry";

/**
 * The product's longest side fills this share of the square.
 * The remaining 12 % is split into a 6 % margin on every side.
 */
export const PRODUCT_FILL = 0.88;

/** Near-white and transparent pixels are empty studio background, not the product. */
export function isBackdropPixel(r: number, g: number, b: number, a: number): boolean {
  if (a < 24) return true;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return min >= 242 && max - min <= 16;
}

export type PixelBox = { x: number; y: number; w: number; h: number };

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
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** True when the file is already a centered square with the product at ~88 %. */
export function alreadyFramed(box: PixelBox, width: number, height: number): boolean {
  const side = Math.max(width, height, 1);
  if (Math.abs(width - height) / side > 0.04) return false;
  const longest = Math.max(box.w, box.h) / side;
  const cx = (box.x + box.w / 2) / width;
  const cy = (box.y + box.h / 2) / height;
  return longest >= 0.84 && longest <= 0.93 && Math.abs(cx - 0.5) < 0.04 && Math.abs(cy - 0.5) < 0.04;
}

/** Reframe only when a real empty margin remains. Full-bleed photos stay untouched. */
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
  return Math.min(2000, Math.max(1500, needed));
}

/** Draw rect that centers the product and leaves a 6 % margin inside the square. */
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
