const ARABIC_LETTER =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export type SortUiLang = "ar" | "de";

/** Arabic collation when the UI is Arabic or either title contains Arabic letters. */
export function textSortLocale(a: string, b: string, uiLang: SortUiLang): string {
  if (uiLang === "ar" || ARABIC_LETTER.test(a) || ARABIC_LETTER.test(b)) {
    return "ar";
  }
  return "de";
}

export function compareAlpha(
  a: string,
  b: string,
  uiLang: SortUiLang,
  direction: "az" | "za" = "az"
): number {
  const locale = textSortLocale(a, b, uiLang);
  const cmp = a.localeCompare(b, locale, {
    sensitivity: "base",
    numeric: true,
    usage: "sort",
  });
  return direction === "za" ? -cmp : cmp;
}

type ArabicSortable = {
  name?: string | null;
  nameEn?: string | null;
  nameDe?: string | null;
  name_ar?: string | null;
};

/**
 * Sortierschlüssel: strikt `name_ar` zuerst, dann gemapptes Storefront-`name`
 * (bereits name_ar||name_de), zuletzt deutscher/englischer Fallback.
 */
export function arabicSortKey(item: ArabicSortable): string {
  const ar = String(item.name_ar ?? "").trim();
  if (ar) return ar;
  const mapped = String(item.name ?? "").trim();
  if (mapped) return mapped;
  return String(item.nameDe || item.nameEn || "").trim();
}

/** True wenn kein arabischer Name gesetzt ist (Sortierung fällt auf DE zurück). */
export function missingArabicName(item: ArabicSortable): boolean {
  const ar = String(item.name_ar ?? "").trim();
  if (ar) return false;
  const mapped = String(item.name ?? "").trim();
  // Storefront: `name` ist name_ar||name_de — nur arabische Schrift zählt
  if (mapped && ARABIC_LETTER.test(mapped)) return false;
  return true;
}

/** Shop-Standard: Produkte nach arabischem Namen (أ → ي) via localeCompare('ar'). */
export function sortByArabicName<T extends ArabicSortable>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aMissing = missingArabicName(a);
    const bMissing = missingArabicName(b);
    // Produkte ohne name_ar ans Ende, danach alphabetisch
    if (aMissing !== bMissing) return aMissing ? 1 : -1;
    return compareAlpha(arabicSortKey(a), arabicSortKey(b), "ar", "az");
  });
}
