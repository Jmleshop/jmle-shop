import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Edge-Middleware: Session-Refresh + Admin-Gatekeeping.
 * Matcher schließt nur statische Assets aus — Auth-Cookies werden
 * auf allen App-/API-Routen aktualisiert.
 */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Alle Pfade außer:
     * - _next/static, _next/image
     * - favicon / gängige Bild-Assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
