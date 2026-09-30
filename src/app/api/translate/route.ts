import { NextResponse } from "next/server";
import { translateText, type TranslateLang } from "@/lib/translate";

export const runtime = "nodejs";

export async function POST(request: Request) {
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
    const texts = raw.texts.map((t) => String(t ?? "").slice(0, 2000));
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
