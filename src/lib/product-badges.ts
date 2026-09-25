/**
 * Feste, umschaltbare Produkt-Badges (Highlights) für Admin & Frontend.
 * Werden in products.badges (JSONB-Array von Keys) gespeichert.
 */
export type ProductBadgeKey = "bestseller" | "sale" | "quality";

export interface ProductBadgeDef {
  key: ProductBadgeKey;
  /** Label im Admin-Formular (Deutsch) */
  labelDe: string;
  /** Anzeige-Label im Shop (Arabisch) */
  labelAr: string;
  className: string;
}

export const PRODUCT_BADGES: ProductBadgeDef[] = [
  {
    key: "bestseller",
    labelDe: "Bestseller",
    labelAr: "الأكثر مبيعاً",
    className: "bg-gold text-white",
  },
  {
    key: "sale",
    labelDe: "Im Angebot",
    labelAr: "في العرض",
    className: "bg-red-500 text-white",
  },
  {
    key: "quality",
    labelDe: "Gute Qualität",
    labelAr: "جودة عالية",
    className: "bg-emerald-600 text-white",
  },
];

const VALID_KEYS = new Set<string>(PRODUCT_BADGES.map((b) => b.key));

/** Beliebigen DB-/Formularwert robust in eine Liste gültiger Badge-Keys wandeln. */
export function normalizeBadges(value: unknown): ProductBadgeKey[] {
  let arr: unknown[] = [];
  if (Array.isArray(value)) {
    arr = value;
  } else if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) arr = parsed;
    } catch {
      arr = value.split(",");
    }
  }
  const out: ProductBadgeKey[] = [];
  for (const v of arr) {
    const k = String(v).trim().toLowerCase();
    if (VALID_KEYS.has(k) && !out.includes(k as ProductBadgeKey)) {
      out.push(k as ProductBadgeKey);
    }
  }
  return out;
}

export function badgeDef(key: ProductBadgeKey): ProductBadgeDef | undefined {
  return PRODUCT_BADGES.find((b) => b.key === key);
}
