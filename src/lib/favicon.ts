import { getSiteConfigAsync } from "@/lib/catalog-server";
import { originalImageSrc } from "@/lib/sharp-image";

const FALLBACK_ICON = "/placeholder.svg";
const RESOLVE_TIMEOUT_MS = 8_000;

/** Resolve shop logo URL for browser icons (never invents a new mark). */
export async function resolveFaviconUrl(): Promise<string> {
  try {
    const site = await Promise.race([
      getSiteConfigAsync(),
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), RESOLVE_TIMEOUT_MS)
      ),
    ]);
    if (!site) return FALLBACK_ICON;
    const logo = originalImageSrc((site.logo || "").trim());
    if (logo) return logo;
  } catch (e) {
    console.error("[favicon] resolve:", e);
  }
  return FALLBACK_ICON;
}

/** Absolute http(s) URL suitable for server-side fetch, else null. */
export function absoluteFetchableIconUrl(url: string): string | null {
  const trimmed = (url || "").trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return null;
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
