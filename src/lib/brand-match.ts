import type { BrandSeed } from "@/lib/brand-catalog";

/** Normalisiert Arabisch/Latein für Matching (Alef-Varianten, Diakritik, Spaces). */
export function normalizeMatchText(input: string): string {
  return String(input || "")
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "") // Tashkeel
    .replace(/\u0640/g, "") // Tatweel ـ
    .replace(/[إأآٱا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ء/g, "")
    .toLowerCase()
    // Bindestriche/Unterstriche wie Spaces (Al-Durra, Chtoura_Garden)
    .replace(/[-_/]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Zusätzlich ohne Leerzeichen — fängt „ChtouraGarden“ / zusammengeschriebene Titel ab. */
export function normalizeCompact(input: string): string {
  return normalizeMatchText(input).replace(/\s+/g, "");
}

function isLatinAlias(alias: string): boolean {
  return /[a-z]/i.test(alias) && !/[\u0600-\u06FF]/.test(alias);
}

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
    "هامول",
    "سومار",
    "توسكا",
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
    const re = new RegExp(`(?:^|\\s)${escapeRegExp(a)}(?:\\s|$)`, "u");
    if (re.test(h)) return true;
    // Latein kompakt nur bei Alias-Länge ≥ 5 (vermeidet „rana“ in Zufallswörtern)
    if (isLatinAlias(alias) && a.length >= 5) {
      const hc = normalizeCompact(haystack);
      const ac = normalizeCompact(alias);
      const re2 = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(ac)}(?:[^a-z0-9]|$)`, "i");
      return re2.test(hc);
    }
    return false;
  }

  if (h.includes(a)) return true;
  // Arabisch ohne Spaces (z. B. „حدائقشتورة“)
  if (a.length >= 4) {
    const hc = normalizeCompact(haystack);
    const ac = normalizeCompact(alias);
    if (ac && hc.includes(ac)) return true;
  }
  return false;
}

export type ProductMatchInput = {
  id: string;
  name_ar?: string | null;
  name_de?: string | null;
  description?: string | null;
  ingredients?: string | null;
  allergens?: string | null;
  custom_note?: string | null;
  barcode?: string | null;
  product_number?: string | null;
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

export function productSearchBlob(product: ProductMatchInput): string {
  return [
    product.name_ar,
    product.name_de,
    product.description,
    product.ingredients,
    product.allergens,
    product.custom_note,
    product.barcode,
    product.product_number,
  ]
    .filter(Boolean)
    .join(" \n ");
}

export function matchProductToBrand(
  product: ProductMatchInput,
  aliasIndex: ReturnType<typeof buildAliasIndex>
): string | null {
  const blob = productSearchBlob(product);
  for (const row of aliasIndex) {
    if (textContainsAlias(blob, row.alias)) return row.brandId;
  }
  return null;
}
