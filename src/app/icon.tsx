import { resolveFaviconUrl } from "@/lib/favicon";

export const runtime = "nodejs";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Next.js App Router icon — proxies the existing shop logo when available.
 * Falls back to public/placeholder.svg without inventing a new brand mark.
 */
export default async function Icon() {
  const url = await resolveFaviconUrl();
  try {
    const res = await fetch(url, {
      next: { revalidate: 300, tags: ["catalog", "site"] },
    });
    if (res.ok) {
      const buf = await res.arrayBuffer();
      const type = res.headers.get("content-type") || contentType;
      return new Response(buf, {
        headers: {
          "Content-Type": type,
          "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        },
      });
    }
  } catch (e) {
    console.error("[icon]", e);
  }

  // Local placeholder fallback
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const svg = await readFile(join(process.cwd(), "public", "placeholder.svg"));
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=60",
    },
  });
}
