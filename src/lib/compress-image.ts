import {
  MAX_EDGE_PRODUCT,
  STORAGE_MAX_MB,
  STORAGE_WEBP_QUALITY,
  maxEdgeForFolder,
} from "@/lib/image-bounds";
import {
  centerImageInTransparentSquare,
  shouldAutoCenterFolder,
} from "@/lib/center-image-square";

/**
 * Client-Upload: immer WebP, harte Bounds, keine Temp-Dateien.
 * Produkte/Kategorien: optionale 1:1-Zentrierung (transparent).
 * Banner/Logos: Aspekt behalten, nur skalieren + komprimieren.
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

  try {
    const imageCompression = (await import("browser-image-compression")).default;
    const compressed = await imageCompression(file, {
      maxSizeMB: STORAGE_MAX_MB,
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

/** Canvas → WebP, skaliert auf maxEdge (kein Disk-Temp). */
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
 * Upload → immer komprimiertes WebP in Supabase Storage.
 * Keine Original-Riesenfiles, keine lokalen Temp-Dateien.
 */
export async function uploadProductImage(
  file: File,
  folder = "products",
  options?: { alreadyEncoded?: boolean; skipCenter?: boolean }
): Promise<string> {
  const { createClient } = await import("@/lib/supabase/client");
  const maxEdge = maxEdgeForFolder(folder);
  let working = file;

  if (
    !options?.alreadyEncoded &&
    !options?.skipCenter &&
    shouldAutoCenterFolder(folder)
  ) {
    try {
      working = await centerImageInTransparentSquare(file, { maxEdge });
    } catch {
      working = file;
    }
  }

  // Immer neu enkodieren (auch Cutouts) → harte Bounds + q78, kein Raw-Upload
  const compressed = await compressImageFile(working, maxEdge);

  const supabase = createClient();
  const path = `${folder}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, compressed, {
      contentType: "image/webp",
      upsert: false,
      cacheControl: "31536000",
    });
  if (error) throw error;
  return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}
