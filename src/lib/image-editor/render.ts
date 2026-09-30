import {
  cropPixels,
  squarePlacement,
  straightenedOutputSize,
  transformedOutputSize,
} from "./geometry";
import { productFrame } from "./product-bounds";
import { applyAdjustments, applyHealSpots, hasAnyAdjustment } from "./pixels";
import {
  resolveExportEdge,
  type RenderSettings,
  type StudioBackground,
} from "./types";

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
  settings: Pick<RenderSettings, "adjustments" | "rotation" | "flipH" | "flipV"> &
    Partial<Pick<RenderSettings, "straighten" | "heal" | "crop" | "background">>,
  maxEdge: number
): HTMLCanvasElement {
  const angle = settings.rotation + (settings.straighten ?? 0);
  const { width, height, srcDrawW, srcDrawH } =
    settings.straighten
      ? straightenedOutputSize(bitmap.width, bitmap.height, angle, maxEdge)
      : transformedOutputSize(bitmap.width, bitmap.height, settings.rotation, maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas nicht verfügbar");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.scale(settings.flipH ? -1 : 1, settings.flipV ? -1 : 1);
  ctx.drawImage(bitmap, -srcDrawW / 2, -srcDrawH / 2, srcDrawW, srcDrawH);
  ctx.restore();

  if (hasAnyAdjustment(settings.adjustments) || (settings.heal?.length ?? 0) > 0) {
    const image = ctx.getImageData(0, 0, width, height);
    if (hasAnyAdjustment(settings.adjustments)) {
      applyAdjustments(image.data, width, height, settings.adjustments);
    }
    if (settings.heal?.length) {
      applyHealSpots(image.data, width, height, settings.heal);
    }
    ctx.putImageData(image, 0, 0);
  }

  return canvas;
}

function paintStudio(
  ctx: CanvasRenderingContext2D,
  size: number,
  studio: StudioBackground
) {
  if (studio === "neutral") {
    ctx.fillStyle = "#f8f9fa";
    ctx.fillRect(0, 0, size, size);
    return;
  }
  if (studio === "marble") {
    ctx.fillStyle = "#f4f1ec";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 18; i++) {
      ctx.strokeStyle = i % 2 ? "rgba(180,180,176,0.35)" : "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1 + (i % 3);
      ctx.beginPath();
      ctx.moveTo(0, (i * size) / 18);
      ctx.bezierCurveTo(
        size * 0.3,
        (i * size) / 18 + Math.sin(i) * 24,
        size * 0.7,
        (i * size) / 18 - Math.cos(i) * 18,
        size,
        (i * size) / 18 + 8
      );
      ctx.stroke();
    }
    return;
  }
  const wood = ctx.createLinearGradient(0, 0, 0, size);
  wood.addColorStop(0, "#c4a574");
  wood.addColorStop(0.5, "#a67c52");
  wood.addColorStop(1, "#8d5e3c");
  ctx.fillStyle = wood;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(90,50,24,0.25)";
  for (let y = 8; y < size; y += 14) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y + 3);
    ctx.stroke();
  }
}

export function renderSquareCanvas(
  filtered: HTMLCanvasElement,
  settings: Pick<
    RenderSettings,
    "crop" | "background" | "studio" | "backgroundColor" | "margin" | "shadow" | "watermark"
  >,
  size: number
): HTMLCanvasElement {
  const crop = cropPixels(settings.crop, filtered.width, filtered.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas nicht verfügbar");

  const studio = settings.studio ?? "none";
  if (studio !== "none") {
    paintStudio(ctx, size, studio);
  } else if (settings.background === "white") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
  } else if (settings.background === "color") {
    ctx.fillStyle = settings.backgroundColor || "#f8f9fa";
    ctx.fillRect(0, 0, size, size);
  } else {
    ctx.clearRect(0, 0, size, size);
  }

  const place =
    settings.margin === false
      ? squarePlacement(crop.w, crop.h, size)
      : productFrame(crop.w, crop.h, size);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const shadow = settings.shadow ?? "none";
  if (shadow === "contact" || shadow === "both") {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.filter = "blur(10px)";
    ctx.beginPath();
    ctx.ellipse(
      place.dx + place.dw / 2,
      place.dy + place.dh - Math.max(4, place.dh * 0.03),
      place.dw * 0.28,
      Math.max(4, place.dh * 0.035),
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  if (shadow === "drop" || shadow === "both") {
    ctx.shadowColor = "rgba(0,0,0,0.32)";
    ctx.shadowBlur = Math.max(8, Math.round(size * 0.035));
    ctx.shadowOffsetY = Math.max(6, Math.round(size * 0.025));
  }
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
  ctx.restore();

  if (settings.watermark) {
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = "#1f2937";
    ctx.font = `${Math.max(12, Math.round(size * 0.032))}px sans-serif`;
    ctx.textAlign = "right";
    ctx.fillText("jmle", size * 0.94, size * 0.94);
    ctx.restore();
  }
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

function drawSquare(source: HTMLCanvasElement, edge: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = edge;
  canvas.height = edge;
  const ctx = canvas.getContext("2d");
  if (!ctx) return source;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, edge, edge);
  return canvas;
}

/** Step the square up so a small source still lands on the chosen Ultra-HD edge. */
function stepUpscale(source: HTMLCanvasElement, target: number): HTMLCanvasElement {
  let current = source;
  while (Math.max(current.width, current.height) * 2 < target) {
    current = drawSquare(current, Math.max(current.width, current.height) * 2);
  }
  if (current.width === target && current.height === target) return current;
  return drawSquare(current, target);
}

export async function exportProductImage(
  bitmap: ImageBitmap,
  settings: RenderSettings
): Promise<File> {
  const longest = Math.max(bitmap.width, bitmap.height, 1);
  const target = resolveExportEdge(longest, settings.upscale);
  // Kein Upscale über die Quellauflösung hinaus — Qualität bleibt erhalten
  const native = Math.min(target, longest);
  const filtered = renderFilteredCanvas(bitmap, settings, native);
  let square = renderSquareCanvas(filtered, settings, native);
  if (
    settings.upscale &&
    (square.width < target || square.height < target) &&
    longest >= target
  ) {
    square = stepUpscale(square, target);
  }
  // Immer WebP q90 — Alpha bleibt bei transparentem Hintergrund erhalten
  const quality = 0.9;
  const blob = await new Promise<Blob | null>((resolve) => {
    square.toBlob(resolve, "image/webp", quality);
  });
  if (!blob) throw new Error("Export fehlgeschlagen");
  return new File([blob], "product.webp", { type: "image/webp" });
}
