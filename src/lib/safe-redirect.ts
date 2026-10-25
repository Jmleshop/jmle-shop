/**
 * Nur interne Pfade zulassen. `${origin}${next}` mit z. B. "@evil.example"
 * oder ".evil.example" würde sonst auf eine fremde Domain umleiten.
 */
export function safeNextPath(next: string | null, baseOrigin: string, fallback = "/profile"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  try {
    const url = new URL(next, baseOrigin);
    if (url.origin !== new URL(baseOrigin).origin) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
