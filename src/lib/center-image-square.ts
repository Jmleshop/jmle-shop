import { MAX_EDGE_PRODUCT, STORAGE_WEBP_QUALITY } from "@/lib/image-bounds";
import { PRODUCT_FILL } from "@/lib/image-editor/product-bounds";

/**
 * Zentriert ein sauberes Bild optisch in ein transparentes 1:1-Quadrat.
 * Kein Freisteller, kein farbiger Kasten, kein Abschneiden des Motivs.
 */
export async function centerImageInTransparentSquare(
  file: File,
  options?: { maxEdge?: number; fill?: number }
): Promise<File> {
  const maxEdge = options?.maxEdge ?? MAX_EDGE_PRODUCT;
  const fill = options?.fill ?? PRODUCT_FILL;

  const bitmap = await createImageBitmap(file);
  try {
    const srcW = bitmap.width;
    const srcH = bitmap.height;
    if (srcW < 2 || srcH < 2) return file;

    const longest = Math.max(srcW, srcH, 1);
    const side = Math.min(maxEdge, Math.max(longest, Math.round(longest / fill)));
    const inner = Math.max(1, Math.round(side * fill));
    const scale = Math.min(inner / srcW, inner / srcH);
    const dw = Math.max(1, Math.round(srcW * scale));
    const dh = Math.max(1, Math.round(srcH * scale));
    const dx = Math.round((side - dw) / 2);
    const dy = Math.round((side - dh) / 2);

    const canvas = document.createElement("canvas");
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    // 100 % transparent — kein Weiß/Cream/Grau
    ctx.clearRect(0, 0, side, side);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, srcW, srcH, dx, dy, dw, dh);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", STORAGE_WEBP_QUALITY)
    );
    if (!blob) return file;
    return new File([blob], `centered-${Date.now()}.webp`, { type: "image/webp" });
  } finally {
    bitmap.close();
  }
}

/** Ordner, die 1:1-Zentrierung erhalten (keine Banner). */
export function shouldAutoCenterFolder(folder: string): boolean {
  const key = folder.trim().toLowerCase();
  return !/^(banners?|slides|hero)$/.test(key);
}
