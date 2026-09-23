import imageCompression from "browser-image-compression";

export async function compressImageFile(
  file: File,
  maxWidth = 1400
): Promise<File> {
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 0.65,
      maxWidthOrHeight: maxWidth,
      useWebWorker: true,
      fileType: "image/webp",
      initialQuality: 0.85,
    });
    const name = file.name.replace(/\.\w+$/, ".webp");
    return new File([compressed], name, { type: "image/webp" });
  } catch {
    // Fallback: Canvas-WebP
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, maxWidth / bitmap.width);
      const width = Math.round(bitmap.width * scale);
      const height = Math.round(bitmap.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", 0.82)
      );
      if (!blob) return file;
      return new File([blob], file.name.replace(/\.\w+$/, ".webp"), {
        type: "image/webp",
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
  const path = `${folder}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, compressed, { contentType: compressed.type, upsert: false });
  if (error) throw error;
  return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}
