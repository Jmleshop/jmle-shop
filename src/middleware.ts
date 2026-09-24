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

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
