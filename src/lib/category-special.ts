/** Systemweite Sale-Kategorie (virtuell — keine manuelle Produktzuweisung) */
export const SALE_CATEGORY_ID = "sale";

export const SALE_CATEGORY = {
  id: SALE_CATEGORY_ID,
  name: "العروض",
  nameEn: "Sale",
  image:
    "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=800&q=80",
  parentId: null as string | null,
  sortOrder: -100,
} as const;

const SALE_NAME_RE =
  /^(sale|sales|angebote?|angebot|rabatt|offers?|offerte|العروض|تخفيضات|تخفيض)$/i;

/** ID oder Name der Kategorie = Sale-Spezialbereich */
export function isSaleCategoryId(id: string): boolean {
  const n = id.trim().toLowerCase();
  return (
    n === SALE_CATEGORY_ID ||
    n === "العروض" ||
    n === "angebote" ||
    n === "angebot" ||
    n === "rabatt" ||
    n === "offers" ||
    n === "offer"
  );
}

export function isSaleCategoryName(
  name?: string | null,
  nameEn?: string | null
): boolean {
  const candidates = [name, nameEn].filter(Boolean).map((s) => String(s).trim());
  return candidates.some((c) => SALE_NAME_RE.test(c));
}

export function isSaleCategory(cat: {
  id: string;
  name?: string | null;
  nameEn?: string | null;
}): boolean {
  return isSaleCategoryId(cat.id) || isSaleCategoryName(cat.name, cat.nameEn);
}

/**
 * Produkt ist im Sale, wenn aktiver Rabatt vorliegt.
 * Schema: discount_percent > 0 → Verkaufspreis < Listenpreis (kein discount_price-Feld).
 */
export function productIsOnSale(p: {
  discountPercent?: number | null;
  price?: number;
  originalPrice?: number | null;
}): boolean {
  const pct = Number(p.discountPercent ?? 0);
  if (Number.isFinite(pct) && pct > 0) return true;
  if (
    p.originalPrice != null &&
    p.price != null &&
    Number(p.originalPrice) > Number(p.price)
  ) {
    return true;
  }
  return false;
}

/**
 * Sammelt Kategorie + alle Nachfahren (Unterkategorien) rekursiv.
 * Produkte einer Unterkategorie erscheinen damit in der Oberkategorie.
 */
export function collectCategoryAndDescendantIds(
  categoryId: string,
  flat: { id: string; parentId?: string | null }[]
): Set<string> {
  const childrenOf = new Map<string, string[]>();
  for (const c of flat) {
    const p = c.parentId ?? "";
    if (!childrenOf.has(p)) childrenOf.set(p, []);
    if (c.parentId) {
      childrenOf.get(c.parentId)!.push(c.id);
    }
  }

  const ids = new Set<string>();
  const stack = [categoryId];
  while (stack.length) {
    const id = stack.pop()!;
    if (ids.has(id)) continue;
    ids.add(id);
    for (const child of childrenOf.get(id) ?? []) {
      stack.push(child);
    }
  }
  return ids;
}
