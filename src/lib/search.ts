/**
 * Entfernt arabische Diakritika und normalisiert Buchstabenvarianten
 * für tolerantere Client-/Fallback-Suche.
 */
export function normalizeArabicSearch(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[إأآٱا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Baut ILIKE-Varianten (Original + normalisiert) für Supabase-Filter */
export function searchQueryVariants(q: string): string[] {
  const raw = q.trim();
  if (!raw) return [];
  const norm = normalizeArabicSearch(raw);
  const set = new Set<string>([raw]);
  if (norm && norm !== raw.toLowerCase()) set.add(norm);
  return Array.from(set);
}
