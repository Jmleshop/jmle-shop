import { NextResponse, type NextRequest } from "next/server";
import {
  PRODUCTION_HOST,
  isPreviewDeploymentHost,
} from "@/lib/app-url";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Edge-Middleware: Preview-Hosts → Hauptdomain, dann Session + Admin-Gate.
 */
export async function middleware(request: NextRequest) {
  const hostHeader =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";
  const hostname = hostHeader.split(",")[0]?.trim().split(":")[0] ?? "";

  // Vercel-Preview-URLs dauerhaft auf die feste Hauptdomain umleiten
  if (isPreviewDeploymentHost(hostname)) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.hostname = PRODUCTION_HOST;
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  const response = await updateSession(request);

  const path = request.nextUrl.pathname;

  // Builder braucht eine echte Shop-Vorschau im iframe.
  // COEP am Parent blockiert Documents ohne COEP → Preview zeigt Fehler-Icon.
  // Isolation daher nur auf Seiten mit WASM/SharedArrayBuffer (z. B. Produkte).
  const needsCrossOriginIsolation =
    path.startsWith("/admin") &&
    !path.startsWith("/admin/builder") &&
    !path.startsWith("/admin/login");

  if (needsCrossOriginIsolation) {
    response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    response.headers.set("Cross-Origin-Embedder-Policy", "credentialless");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
