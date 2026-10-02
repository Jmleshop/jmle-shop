import type { BrandSeed } from "@/lib/brand-catalog";

/** Normalisiert Arabisch/Latein für Matching (Alef-Varianten, Diakritik, Spaces). */
export function normalizeMatchText(input: string): string {
  return String(input || "")
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "") // Tashkeel
    .replace(/[إأآٱا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isLatinAlias(alias: string): boolean {
  // Enthält lateinische Buchstaben und kein Arabisch
  return /[a-z]/i.test(alias) && !/[\u0600-\u06FF]/.test(alias);
}

/**
 * Kurze/häufige arabische Tokens brauchen Wortgrenzen (False Positives).
 * Lateinische Aliasse immer mit Wortgrenze (z. B. „Amarin“ ≠ „Tamarindensaft“).
 */
function needsStrictBoundary(alias: string): boolean {
  if (isLatinAlias(alias)) return true;
  const n = normalizeMatchText(alias);
  if (n.length <= 3) return true;
  const strict = new Set([
    "هنا",
    "لينا",
    "رنا",
    "لارا",
    "دانا",
    "دانه",
    "بوك",
    "مازا",
    "نجار",
    "زوان",
    "بلبل",
    "ديمو",
    "شوكس",
    "دومو",
    "كيري",
    "راني",
    "احمد",
    "محمود",
    "شهيه",
    "كرزه",
  ]);
  return strict.has(n);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function textContainsAlias(haystack: string, alias: string): boolean {
  const h = normalizeMatchText(haystack);
  const a = normalizeMatchText(alias);
  if (!h || !a) return false;
  if (needsStrictBoundary(alias)) {
    // Wortgrenze: Whitespace oder String-Anfang/Ende (nach Normalisierung)
    const re = new RegExp(`(?:^|\\s)${escapeRegExp(a)}(?:\\s|$)`, "u");
    return re.test(h);
  }
  return h.includes(a);
}

export type ProductMatchInput = {
  id: string;
  name_ar?: string | null;
  name_de?: string | null;
  description?: string | null;
  ingredients?: string | null;
  custom_note?: string | null;
  brand_id?: string | null;
};

/** Längste Aliasse zuerst → spezifischere Treffer gewinnen. */
export function buildAliasIndex(catalog: BrandSeed[]): Array<{
  brandId: string;
  alias: string;
  aliasNorm: string;
}> {
  const rows: Array<{ brandId: string; alias: string; aliasNorm: string }> = [];
  for (const b of catalog) {
    for (const alias of b.aliases) {
      rows.push({
        brandId: b.id,
        alias,
        aliasNorm: normalizeMatchText(alias),
      });
    }
  }
  rows.sort((a, b) => b.aliasNorm.length - a.aliasNorm.length);
  return rows;
}

export function matchProductToBrand(
  product: ProductMatchInput,
  aliasIndex: ReturnType<typeof buildAliasIndex>
): string | null {
  const blob = [
    product.name_ar,
    product.name_de,
    product.description,
    product.ingredients,
    product.custom_note,
  ]
    .filter(Boolean)
    .join(" \n ");

  for (const row of aliasIndex) {
    if (textContainsAlias(blob, row.alias)) return row.brandId;
  }
  return null;
}
