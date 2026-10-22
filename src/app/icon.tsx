import {
  absoluteFetchableIconUrl,
  resolveFaviconUrl,
} from "@/lib/favicon";

export const runtime = "nodejs";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";
/** Cache at the edge — avoid re-fetching the logo from Supabase every request. */
export const revalidate = 86400;

const CACHE_CONTROL =
  "public, max-age=86400, stale-while-revalidate=604800";

/**
 * Next.js App Router icon — proxies the existing shop logo when available.
 * Falls back to public/placeholder.svg without inventing a new brand mark.
 */
export default async function Icon() {
  const resolved = await resolveFaviconUrl();
  const remote = absoluteFetchableIconUrl(resolved);
  if (remote) {
    try {
      const res = await fetch(remote, {
        signal: AbortSignal.timeout(8_000),
        next: { revalidate: 86400, tags: ["catalog", "site"] },
      });
      if (res.ok) {
        const buf = await res.arrayBuffer();
        const type = res.headers.get("content-type") || contentType;
        return new Response(buf, {
          headers: {
            "Content-Type": type,
            "Cache-Control": CACHE_CONTROL,
          },
        });
      }
    } catch (e) {
      console.error("[icon]", e);
    }
  }

  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const svg = await readFile(join(process.cwd(), "public", "placeholder.svg"));
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": CACHE_CONTROL,
    },
  });
}
