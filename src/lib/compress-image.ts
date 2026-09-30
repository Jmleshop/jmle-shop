import {
  MAX_EDGE_PRODUCT,
  STORAGE_WEBP_QUALITY,
  maxEdgeForFolder,
} from "@/lib/image-bounds";

/**
 * Client-seitige Speicher-Optimierung:
 * - Immer WebP (inkl. Alpha für Freisteller)
 * - quality 90 → optisch HD, deutlich kleinere Dateien
 * - Max-Bounds je Ordner (Produkte 1000 / Banner 2048)
 * - EXIF/Metadaten entfallen durch Canvas-Reencode
 * - Keine festen Hintergrundfarben
 */

async function encodeWebpFromBitmap(
  bitmap: ImageBitmap,
  maxEdge: number,
  quality = STORAGE_WEBP_QUALITY
): Promise<File | null> {
  const scale = Math.min(1, maxEdge / Math.max(1, bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  // Transparent lassen — keine Weiß-/Cream-Fläche
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", quality)
  );
  if (!blob) return null;
  return new File([blob], `upload-${Date.now()}.webp`, { type: "image/webp" });
}

export async function compressImageFile(
  file: File,
  maxEdge = MAX_EDGE_PRODUCT
): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    try {
      const encoded = await encodeWebpFromBitmap(bitmap, maxEdge);
      if (encoded) return encoded;
    } finally {
      bitmap.close();
    }
  } catch {
    /* fall through */
  }

  // Fallback: browser-image-compression → WebP q90
  try {
    const imageCompression = (await import("browser-image-compression")).default;
    const compressed = await imageCompression(file, {
      maxSizeMB: 1.5,
      maxWidthOrHeight: maxEdge,
      useWebWorker: true,
      fileType: "image/webp",
      initialQuality: STORAGE_WEBP_QUALITY,
      alwaysKeepResolution: false,
    });
    return new File([compressed], file.name.replace(/\.\w+$/, ".webp"), {
      type: "image/webp",
    });
  } catch {
    return file;
  }
}

function fitCanvas(canvas: HTMLCanvasElement, maxEdge: number): HTMLCanvasElement {
  const edge = Math.max(canvas.width, canvas.height);
  if (edge <= maxEdge) return canvas;
  const scale = maxEdge / edge;
  const next = document.createElement("canvas");
  next.width = Math.max(1, Math.round(canvas.width * scale));
  next.height = Math.max(1, Math.round(canvas.height * scale));
  const ctx = next.getContext("2d");
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.clearRect(0, 0, next.width, next.height);
  ctx.drawImage(canvas, 0, 0, next.width, next.height);
  return next;
}

/** Canvas → WebP q90, skaliert auf maxEdge. */
export async function canvasToCompressedFile(
  canvas: HTMLCanvasElement,
  filename = "crop.webp",
  maxEdge = MAX_EDGE_PRODUCT
): Promise<File> {
  const fitted = fitCanvas(canvas, maxEdge);
  const blob = await new Promise<Blob | null>((resolve) =>
    fitted.toBlob(resolve, "image/webp", STORAGE_WEBP_QUALITY)
  );
  if (!blob) throw new Error("Crop fehlgeschlagen");
  return new File([blob], filename.replace(/\.\w+$/, ".webp"), {
    type: "image/webp",
  });
}

/**
 * Upload in Supabase Storage.
 * Immer WebP-Optimierung (auch nach Turbo-Pipeline), Ordner steuert Max-Kante.
 */
export async function uploadProductImage(
  file: File,
  folder = "products",
  options?: { alreadyEncoded?: boolean }
): Promise<string> {
  const { createClient } = await import("@/lib/supabase/client");
  const maxEdge = maxEdgeForFolder(folder);
  // Auch „alreadyEncoded“ Freisteller → WebP q90 + Bounds (Alpha bleibt)
  void options?.alreadyEncoded;
  const compressed = await compressImageFile(file, maxEdge);
  const supabase = createClient();
  const ext = compressed.type === "image/png" ? "png" : "webp";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, compressed, { contentType: compressed.type, upsert: false });
  if (error) throw error;
  return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}
