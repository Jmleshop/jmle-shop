import { compressImageFile } from "@/lib/compress-image";
import {
  cropPixels,
  squarePlacement,
  transformedOutputSize,
} from "./geometry";
import { applyAdjustments, hasAnyAdjustment } from "./pixels";
import { EXPORT_SIZE, type RenderSettings } from "./types";

export async function loadSourceBlob(source: File | string): Promise<Blob> {
  if (typeof source !== "string") return source;
  const response = await fetch(source);
  if (!response.ok) {
    throw new Error("Bild konnte nicht geladen werden");
  }
  return response.blob();
}

export async function bitmapFromBlob(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob);
  } catch {
    const url = URL.createObjectURL(blob);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("Bildformat wird nicht unterstützt"));
        el.src = url;
      });
      return await createImageBitmap(image);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

export function renderFilteredCanvas(
  bitmap: ImageBitmap,
  settings: Pick<RenderSettings, "adjustments" | "rotation" | "flipH" | "flipV">,
  maxEdge: number
): HTMLCanvasElement {
  const { width, height, srcDrawW, srcDrawH } = transformedOutputSize(
    bitmap.width,
    bitmap.height,
    settings.rotation,
    maxEdge
  );
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas nicht verfügbar");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate((settings.rotation * Math.PI) / 180);
  ctx.scale(settings.flipH ? -1 : 1, settings.flipV ? -1 : 1);
  ctx.drawImage(bitmap, -srcDrawW / 2, -srcDrawH / 2, srcDrawW, srcDrawH);
  ctx.restore();

  if (hasAnyAdjustment(settings.adjustments)) {
    const image = ctx.getImageData(0, 0, width, height);
    applyAdjustments(image.data, width, height, settings.adjustments);
    ctx.putImageData(image, 0, 0);
  }

  return canvas;
}

export function renderSquareCanvas(
  filtered: HTMLCanvasElement,
  settings: Pick<RenderSettings, "crop" | "background">,
  size: number
): HTMLCanvasElement {
  const crop = cropPixels(settings.crop, filtered.width, filtered.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas nicht verfügbar");

  if (settings.background === "white") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
  } else {
    ctx.clearRect(0, 0, size, size);
  }

  const place = squarePlacement(crop.w, crop.h, size);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    filtered,
    crop.x,
    crop.y,
    crop.w,
    crop.h,
    place.dx,
    place.dy,
    place.dw,
    place.dh
  );
  return canvas;
}

export function blitCanvas(target: HTMLCanvasElement, source: HTMLCanvasElement) {
  if (target.width !== source.width) target.width = source.width;
  if (target.height !== source.height) target.height = source.height;
  const ctx = target.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, target.width, target.height);
  ctx.drawImage(source, 0, 0);
}

export async function exportProductImage(
  bitmap: ImageBitmap,
  settings: RenderSettings
): Promise<File> {
  const filtered = renderFilteredCanvas(bitmap, settings, EXPORT_SIZE);
  const square = renderSquareCanvas(filtered, settings, EXPORT_SIZE);
  const transparent = settings.background === "transparent";
  const mime = transparent ? "image/png" : "image/webp";
  const blob = await new Promise<Blob | null>((resolve) => {
    square.toBlob(resolve, mime, transparent ? 0.92 : 0.9);
  });
  if (!blob) throw new Error("Export fehlgeschlagen");
  const ext = transparent ? "png" : "webp";
  const file = new File([blob], `product.${ext}`, { type: mime });
  return compressImageFile(file, EXPORT_SIZE);
}
