import { NextResponse } from "next/server";
import { isAuthError, requireStaff } from "@/lib/admin-server";
import { translateText, type TranslateLang } from "@/lib/translate";

export const runtime = "nodejs";

/** Max. Texte pro Anfrage — schützt das DeepL-/MyMemory-Kontingent. */
const MAX_TEXTS = 50;

export async function POST(request: Request) {
  // Nur Personal: öffentlich ließ sich das Übersetzungs-Kontingent von außen verbrauchen.
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  const raw = body as {
    text?: string;
    from?: string;
    to?: string;
    texts?: string[];
  };

  const from = (raw.from === "de" || raw.from === "ar" ? raw.from : null) as TranslateLang | null;
  const to = (raw.to === "de" || raw.to === "ar" ? raw.to : null) as TranslateLang | null;
  if (!from || !to) {
    return NextResponse.json({ error: "from/to müssen de oder ar sein" }, { status: 400 });
  }

  if (Array.isArray(raw.texts)) {
    const texts = raw.texts.slice(0, MAX_TEXTS).map((t) => String(t ?? "").slice(0, 2000));
    const translated = await Promise.all(
      texts.map((t) => (t.trim() ? translateText(t, from, to) : Promise.resolve("")))
    );
    return NextResponse.json({ translations: translated });
  }

  const text = String(raw.text ?? "").trim().slice(0, 2000);
  if (!text) {
    return NextResponse.json({ translation: "" });
  }

  const translation = await translateText(text, from, to);
  return NextResponse.json({ translation });
}
