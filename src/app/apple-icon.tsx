import {
  absoluteFetchableIconUrl,
  resolveFaviconUrl,
} from "@/lib/favicon";

export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";
export const revalidate = 300;

/** Apple touch icon — same shop logo source as favicon. */
export default async function AppleIcon() {
  const resolved = await resolveFaviconUrl();
  const remote = absoluteFetchableIconUrl(resolved);
  if (remote) {
    try {
      const res = await fetch(remote, {
        signal: AbortSignal.timeout(8_000),
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
      console.error("[apple-icon]", e);
    }
  }

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
