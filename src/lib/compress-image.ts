import imageCompression from "browser-image-compression";

function outputFormat(file: File): { mime: "image/png" | "image/webp"; ext: "png" | "webp" } {
  if (file.type === "image/png") return { mime: "image/png", ext: "png" };
  return { mime: "image/webp", ext: "webp" };
}

export async function compressImageFile(
  file: File,
  maxWidth = 1400
): Promise<File> {
  const { mime, ext } = outputFormat(file);
  const png = mime === "image/png";
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: png ? 1.4 : 0.65,
      maxWidthOrHeight: maxWidth,
      useWebWorker: true,
      fileType: mime,
      initialQuality: png ? 0.92 : 0.85,
    });
    const name = file.name.replace(/\.\w+$/, `.${ext}`);
    return new File([compressed], name, { type: mime });
  } catch {
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, maxWidth / Math.max(1, bitmap.width));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      if (!png) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
      }
      ctx.drawImage(bitmap, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, mime, png ? 0.92 : 0.82)
      );
      if (!blob) return file;
      return new File([blob], file.name.replace(/\.\w+$/, `.${ext}`), {
        type: mime,
      });
    } catch {
      return file;
    }
  }
}

/** Cropped Pixel-Area → komprimiertes WebP-File */
export async function canvasToCompressedFile(
  canvas: HTMLCanvasElement,
  filename = "crop.webp"
): Promise<File> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.9)
  );
  if (!blob) throw new Error("Crop fehlgeschlagen");
  const file = new File([blob], filename, { type: "image/webp" });
  return compressImageFile(file, 1400);
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
