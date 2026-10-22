import { getAppUrl } from "@/lib/app-url";

/** Next.js Image quality for shop delivery (sharp WebP/AVIF). */
export const SHOP_IMAGE_QUALITY = 75;

/** Long-lived cache for optimized image responses (Vercel CDN + browsers). */
export const SHOP_IMAGE_CACHE_CONTROL =
  "public, max-age=31536000, immutable, stale-while-revalidate=86400";

/**
 * Prefer the original storage object over Supabase image transforms.
 * Transform URLs (`/render/image/` plus width/quality) are what make
 * already-uploaded photos look soft in the shop.
 *
 * Always pass the result through next/image (never `unoptimized` on thumbnails)
 * so Vercel serves resized AVIF/WebP and browsers hit CDN cache instead of
 * re-downloading full originals from Supabase Storage (Cached Egress).
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

/**
 * URL for rare raw `<img>` cases (cart-fly animation). Routes through the
 * Next.js image optimizer so browsers hit Vercel CDN, not Supabase Storage.
 * Prefer the `<Image />` component wherever possible.
 */
export function vercelOptimizedImageSrc(
  src: string | null | undefined,
  width = 128,
  quality = SHOP_IMAGE_QUALITY
): string {
  const absolute = originalImageSrc(src || "");
  if (!absolute) return "";
  if (absolute.startsWith("data:") || absolute.startsWith("/placeholder")) {
    return absolute;
  }
  // Local public assets — no optimizer needed
  if (absolute.startsWith("/") && !absolute.startsWith("//")) {
    return absolute;
  }
  const params = new URLSearchParams({
    url: absolute,
    w: String(Math.max(16, Math.min(1080, Math.round(width)))),
    q: String(Math.max(1, Math.min(100, Math.round(quality)))),
  });
  return `/_next/image?${params.toString()}`;
}

/**
 * Absolute share/OG URL via the shop origin + `/_next/image`.
 * Crawlers and messengers must not hit Supabase Storage directly.
 */
export function absoluteCdnImageUrl(
  src: string | null | undefined,
  width = 1200,
  quality = SHOP_IMAGE_QUALITY
): string {
  const path = vercelOptimizedImageSrc(src, width, quality);
  if (!path) return "";
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
  const base = getAppUrl().replace(/\/$/, "");
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}
