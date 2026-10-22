import { getSiteConfigAsync } from "@/lib/catalog-server";
import { originalImageSrc } from "@/lib/sharp-image";

const FALLBACK_ICON = "/placeholder.svg";
const APP_ICON = "/icon";
const APPLE_ICON = "/apple-icon";
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

/**
 * Metadata icons always point at the App Router proxy routes.
 * Never expose raw Supabase Storage URLs in <link rel="icon"> — every
 * browser tab would otherwise count against Cached Egress.
 */
export function faviconMetadataIcons(_logoUrl?: string) {
  return {
    icon: [{ url: APP_ICON, type: "image/png" as const }],
    shortcut: APP_ICON,
    apple: [{ url: APPLE_ICON, type: "image/png" as const }],
  };
}
