/**
 * Intelligente Max-Auflösung je Upload-Ordner.
 * Produkte/Kategorien/Logos: 1000px — Banner: 2048px.
 * Nie hochskalieren, nur begrenzen.
 */
export const MAX_EDGE_PRODUCT = 1000;
export const MAX_EDGE_BANNER = 2048;
export const STORAGE_WEBP_QUALITY = 0.9;
export const STORAGE_WEBP_QUALITY_PCT = 90;

export function maxEdgeForFolder(folder: string): number {
  const key = folder.trim().toLowerCase();
  if (key === "banners" || key === "banner" || key === "slides" || key === "hero") {
    return MAX_EDGE_BANNER;
  }
  return MAX_EDGE_PRODUCT;
}
