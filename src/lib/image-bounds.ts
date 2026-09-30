/**
 * Speicher-optimierte Max-Auflösung je Upload-Ordner.
 * Kleinere Kanten + WebP q78 → deutlich weniger Storage (Vercel/Supabase).
 */
export const MAX_EDGE_PRODUCT = 800;
export const MAX_EDGE_BANNER = 1280;
/** Logos ebenfalls begrenzt — keine Multi-MB-Originale mehr. */
export const MAX_EDGE_LOGO = 800;
export const STORAGE_WEBP_QUALITY = 0.78;
export const STORAGE_WEBP_QUALITY_PCT = 78;
/** Ziel-Obergrenze Upload-Datei (MB) nach Kompression. */
export const STORAGE_MAX_MB = 0.45;

export function isLogoFolder(folder: string): boolean {
  return /^(brand|brands|logo|logos)$/.test(folder.trim().toLowerCase());
}

export function maxEdgeForFolder(folder: string): number {
  const key = folder.trim().toLowerCase();
  if (isLogoFolder(key)) return MAX_EDGE_LOGO;
  if (key === "banners" || key === "banner" || key === "slides" || key === "hero") {
    return MAX_EDGE_BANNER;
  }
  return MAX_EDGE_PRODUCT;
}
