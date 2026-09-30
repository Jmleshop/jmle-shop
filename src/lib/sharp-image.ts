/** Next.js Image quality for srcset/HD on desktop (sharp WebP/AVIF). */
export const SHOP_IMAGE_QUALITY = 90;

/**
 * Prefer the original storage object over Supabase image transforms.
 * Transform URLs (`/render/image/` plus width/quality) are what make
 * already-uploaded photos look soft in the shop.
 */
export function originalImageSrc(src: string | null | undefined): string {
  const value = (src ?? "").trim();
  if (!value || value.startsWith("/") || value.startsWith("data:")) return value;
  try {
    const url = new URL(value);
    if (url.pathname.includes("/storage/v1/render/image/")) {
      url.pathname = url.pathname.replace(
        "/storage/v1/render/image/public/",
        "/storage/v1/object/public/"
      );
      url.search = "";
      return url.toString();
    }
    if (url.hostname.endsWith("supabase.co")) {
      for (const key of ["width", "height", "quality", "resize", "format"]) {
        url.searchParams.delete(key);
      }
      return url.toString();
    }
  } catch {
    return value;
  }
  return value;
}
