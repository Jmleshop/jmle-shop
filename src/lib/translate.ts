/**
 * Automatische DE ↔ AR Übersetzung (MyMemory Free API + optional DeepL).
 * Ergebnisse werden im Prozess-Cache gehalten.
 */

export type TranslateLang = "de" | "ar";

const cache = new Map<string, string>();
const ARABIC = /[\u0600-\u06FF]/;

function cacheKey(text: string, from: TranslateLang, to: TranslateLang) {
  return `${from}|${to}|${text.trim().toLowerCase()}`;
}

export function detectScriptLang(text: string): TranslateLang | null {
  const t = text.trim();
  if (!t) return null;
  return ARABIC.test(t) ? "ar" : "de";
}

async function viaDeepL(
  text: string,
  from: TranslateLang,
  to: TranslateLang
): Promise<string | null> {
  const key = process.env.DEEPL_API_KEY?.trim();
  if (!key) return null;
  const endpoint = process.env.DEEPL_API_URL?.trim() ||
    (key.endsWith(":fx")
      ? "https://api-free.deepl.com/v2/translate"
      : "https://api.deepl.com/v2/translate");
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: [text],
        source_lang: from.toUpperCase(),
        target_lang: to.toUpperCase(),
      }),
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      translations?: Array<{ text?: string }>;
    };
    return data.translations?.[0]?.text?.trim() || null;
  } catch {
    return null;
  }
}

async function viaMyMemory(
  text: string,
  from: TranslateLang,
  to: TranslateLang
): Promise<string | null> {
  try {
    const url = new URL("https://api.mymemory.translated.net/get");
    url.searchParams.set("q", text.slice(0, 450));
    url.searchParams.set("langpair", `${from}|${to}`);
    const email = process.env.MYMEMORY_EMAIL?.trim();
    if (email) url.searchParams.set("de", email);

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      responseData?: { translatedText?: string };
      responseStatus?: number;
    };
    if (data.responseStatus !== 200) return null;
    const out = data.responseData?.translatedText?.trim();
    if (!out || out.toUpperCase() === "INVALID SOURCE LANGUAGE OR TARGET LANGUAGE OR TEXT") {
      return null;
    }
    // MyMemory echo / same-language noise
    if (out.toLowerCase() === text.trim().toLowerCase() && from !== to) {
      return null;
    }
    return out;
  } catch {
    return null;
  }
}

export async function translateText(
  text: string,
  from: TranslateLang,
  to: TranslateLang
): Promise<string> {
  const raw = text.trim();
  if (!raw || from === to) return raw;

  const key = cacheKey(raw, from, to);
  const hit = cache.get(key);
  if (hit) return hit;

  const deepL = await viaDeepL(raw, from, to);
  const result = deepL || (await viaMyMemory(raw, from, to)) || raw;
  cache.set(key, result);
  return result;
}

/**
 * Liefert den Text in der Zielsprache.
 * Wenn `preferred` leer ist, wird `fallback` übersetzt.
 */
export async function resolveLocalizedText(
  lang: TranslateLang,
  preferred: string | null | undefined,
  fallback: string | null | undefined
): Promise<string> {
  const pref = (preferred ?? "").trim();
  if (pref) return pref;
  const fb = (fallback ?? "").trim();
  if (!fb) return "";
  const from = lang === "de" ? "ar" : "de";
  return translateText(fb, from, lang);
}
