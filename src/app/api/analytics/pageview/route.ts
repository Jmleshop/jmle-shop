import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { detectDevice, languageRegion } from "@/lib/analytics-periods";

/**
 * Öffentlicher, anonymer Page-View Tracker.
 * Speichert keine IP und keine User-ID.
 */
export async function POST(request: Request) {
  try {
    let body: { path?: string } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
    }

    const path = String(body.path || "").slice(0, 300);
    if (!path.startsWith("/") || path.startsWith("/admin") || path.startsWith("/api")) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const ua = request.headers.get("user-agent") || "";
    const acceptLang = request.headers.get("accept-language");
    const { language, regionHint } = languageRegion(acceptLang);
    const device = detectDevice(ua);
    // Optional: Cloudflare / Vercel geo header (kein PII-Tracking nötig)
    const country =
      request.headers.get("cf-ipcountry") ||
      request.headers.get("x-vercel-ip-country") ||
      null;

    const supabase = createPublicClient();
    const { error } = await supabase.from("page_views").insert({
      path,
      device,
      language,
      region_hint: regionHint,
      country_code: country && country !== "XX" ? country.slice(0, 8) : null,
    });

    if (error) {
      // Tabelle evtl. noch nicht migriert — still ok für den Shop
      if (/relation|does not exist|42P01/i.test(error.message)) {
        return NextResponse.json({ ok: true, skipped: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true, skipped: true });
  }
}
