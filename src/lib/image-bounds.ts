/**
 * Intelligente Max-Auflösung je Upload-Ordner.
 * Produkte/Kategorien: 1000px — Banner: 2048px — Logos: Original (kein Cap).
 * Nie hochskalieren, nur begrenzen.
 */
export const MAX_EDGE_PRODUCT = 1000;
export const MAX_EDGE_BANNER = 2048;
/** Praktisch unbegrenzt — Logos behalten Originalauflösung. */
export const MAX_EDGE_LOGO = 8192;
export const STORAGE_WEBP_QUALITY = 0.9;
export const STORAGE_WEBP_QUALITY_PCT = 90;

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
