import imageCompression from "browser-image-compression";

/** Longest edge kept for web delivery. Never upscaled. */
const MAX_EDGE = 2000;
/** Size cap high enough that quality is not traded for kilobytes. */
const MAX_MB = 8;
const WEBP_QUALITY = 0.95;
const PNG_QUALITY = 0.95;

function outputFormat(file: File): { mime: "image/png" | "image/webp"; ext: "png" | "webp" } {
  if (file.type === "image/png") return { mime: "image/png", ext: "png" };
  return { mime: "image/webp", ext: "webp" };
}

export async function compressImageFile(
  file: File,
  maxWidth = MAX_EDGE
): Promise<File> {
  const { mime, ext } = outputFormat(file);
  const png = mime === "image/png";
  const quality = png ? PNG_QUALITY : WEBP_QUALITY;
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: MAX_MB,
      maxWidthOrHeight: maxWidth,
      useWebWorker: true,
      fileType: mime,
      initialQuality: quality,
      alwaysKeepResolution: false,
    });
    const name = file.name.replace(/\.\w+$/, `.${ext}`);
    return new File([compressed], name, { type: mime });
  } catch {
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, maxWidth / Math.max(1, bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      if (!png) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
      }
      ctx.drawImage(bitmap, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, mime, quality)
      );
      bitmap.close();
      if (!blob) return file;
      return new File([blob], file.name.replace(/\.\w+$/, `.${ext}`), {
        type: mime,
      });
    } catch {
      return file;
    }
  }
}

/** Cropped pixel area → high-quality WebP. A second crush is skipped when the canvas is already in range. */
export async function canvasToCompressedFile(
  canvas: HTMLCanvasElement,
  filename = "crop.webp"
): Promise<File> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", WEBP_QUALITY)
  );
  if (!blob) throw new Error("Crop fehlgeschlagen");
  const file = new File([blob], filename, { type: "image/webp" });
  const edge = Math.max(canvas.width, canvas.height);
  if (edge <= MAX_EDGE && blob.size <= MAX_MB * 1024 * 1024) return file;
  return compressImageFile(file, MAX_EDGE);
}

export async function uploadProductImage(
  file: File,
  folder = "products"
): Promise<string> {
  const { createClient } = await import("@/lib/supabase/client");
  const compressed = await compressImageFile(file);
  const supabase = createClient();
  const ext = compressed.type === "image/png" ? "png" : "webp";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, compressed, { contentType: compressed.type, upsert: false });
  if (error) throw error;
  return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}
