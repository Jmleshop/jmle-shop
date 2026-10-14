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

/** Primär `name_ar` / gemapptes `name`, sonst DE/EN-Fallback. */
export function arabicSortKey(item: ArabicSortable): string {
  return String(
    item.name_ar || item.name || item.nameDe || item.nameEn || ""
  ).trim();
}

/** Shop-Standard: Produkte nach arabischem Namen (أ → ي) via localeCompare('ar'). */
export function sortByArabicName<T extends ArabicSortable>(items: T[]): T[] {
  return [...items].sort((a, b) =>
    compareAlpha(arabicSortKey(a), arabicSortKey(b), "ar", "az")
  );
}
