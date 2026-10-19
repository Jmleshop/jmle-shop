import { getSiteConfigAsync } from "@/lib/catalog-server";
import { originalImageSrc } from "@/lib/sharp-image";

const FALLBACK_ICON = "/placeholder.svg";

/** Resolve shop logo URL for browser icons (never invents a new mark). */
export async function resolveFaviconUrl(): Promise<string> {
  try {
    const site = await getSiteConfigAsync();
    const logo = originalImageSrc((site.logo || "").trim());
    if (logo) return logo;
  } catch (e) {
    console.error("[favicon] resolve:", e);
  }
  return FALLBACK_ICON;
}

export function faviconMetadataIcons(logoUrl: string) {
  const url = logoUrl || FALLBACK_ICON;
  return {
    icon: [{ url, type: guessIconType(url) }],
    shortcut: url,
    apple: [{ url }],
  };
}

function guessIconType(url: string): string | undefined {
  const lower = url.toLowerCase();
  if (lower.includes(".svg")) return "image/svg+xml";
  if (lower.includes(".webp")) return "image/webp";
  if (lower.includes(".jpg") || lower.includes(".jpeg")) return "image/jpeg";
  if (lower.includes(".png")) return "image/png";
  if (lower.includes(".ico")) return "image/x-icon";
  return undefined;
}
