import { NextResponse } from "next/server";
import { isAuthError, requireStaff } from "@/lib/admin-server";
import {
  applyProductWatermark,
  loadProductWatermarkSettings,
} from "@/lib/product-watermark";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Wendet das konfigurierte Produkt-Wasserzeichen serverseitig an.
 * Wenn deaktiviert: Original unverändert zurück.
 */
export async function POST(request: Request) {
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Datei fehlt" }, { status: 400 });
  }

  const input = Buffer.from(await file.arrayBuffer());
  if (!input.length) {
    return NextResponse.json({ error: "Leere Datei" }, { status: 400 });
  }

  try {
    const settings = await loadProductWatermarkSettings(auth.supabase);
    const force =
      String(form.get("force") ?? "0") === "1" ||
      String(form.get("force") ?? "") === "true";
    const effective = force ? { ...settings, enabled: true } : settings;

    const shopName =
      typeof form.get("shopName") === "string"
        ? String(form.get("shopName"))
        : "jmle";

    const result = await applyProductWatermark(input, effective, { shopName });
    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": "image/webp",
        "X-Watermark-Applied": result.applied ? "1" : "0",
        "X-Watermark-Reason": result.reason || (result.applied ? "ok" : "skip"),
        "Cache-Control": "no-store",
      },
    });
  } catch (cause) {
    console.error("[apply-product-watermark]", cause);
    return NextResponse.json(
      {
        error:
          cause instanceof Error
            ? cause.message
            : "Wasserzeichen fehlgeschlagen",
      },
      { status: 500 }
    );
  }
}
