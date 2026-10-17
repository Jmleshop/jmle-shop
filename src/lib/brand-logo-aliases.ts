/**
 * Production brand_logos often use Latin / typo display names that differ
 * from the Arabic catalog seed (e.g. DURRA, Chamise, hamol).
 * Map normalized logo names → extra match aliases (Arabic + Latin).
 */
import { normalizeMatchText } from "@/lib/brand-match";

/** Strip noise words from logo titles before matching. */
const LOGO_SUFFIX_RE =
  /\b(tea|tees?|cafe|café|brand|brands|company|co|foods?|food|shop)\b/gi;

export function logoNameCandidates(name: string): string[] {
  const raw = String(name || "").trim();
  if (!raw) return [];
  const stripped = raw.replace(LOGO_SUFFIX_RE, " ").replace(/\s+/g, " ").trim();
  const out = [raw];
  if (stripped && stripped.toLowerCase() !== raw.toLowerCase()) out.push(stripped);
  return out;
}

/**
 * Key = normalizeMatchText(logo.name).
 * Values = aliases that should match product titles.
 */
const LOGO_ALIAS_MAP: Record<string, string[]> = {
  // Laughing Cow — production typo "qurie"
  "la vache qurie": [
    "جبنة البقرة الضاحكة",
    "البقرة الضاحكة",
    "La Vache Qui Rit",
    "Vache Qui Rit",
    "Laughing Cow",
    "The Laughing Cow",
  ],
  "la vache qui rit": [
    "جبنة البقرة الضاحكة",
    "البقرة الضاحكة",
    "Laughing Cow",
  ],
  // كرزة
  "cheery brand": ["كرزة", "Karaza", "Keraza", "Cheery", "Cherry"],
  cheery: ["كرزة", "Karaza", "Keraza", "Cheery"],
  // شمسين
  chamise: ["شمسين", "Shamsin", "Chamsine", "Chamsin", "Shamseen"],
  chamsine: ["شمسين", "Shamsin", "Chamsine"],
  // هامول (typo missing u)
  hamol: ["هامول", "Hamoul", "Hammoul", "Hamol"],
  hamoul: ["هامول", "Hamoul", "Hammoul"],
  // الراعي duplicate Latin logo
  "al raii": ["الراعي", "Al Rai", "Al-Rai", "Alrai", "Al Raii", "Picon"],
  "al rai": ["الراعي", "Al Rai", "Al Raii"],
  // أحمد
  "ahmad tea": ["أحمد", "احمد", "Ahmad", "Ahmed", "Ahmad Tea"],
  ahmad: ["أحمد", "احمد", "Ahmad", "Ahmed"],
  // دو غزال
  "do ghazal tea": ["دو غزال", "Do Ghazal", "Doghazal", "Do-Ghazal"],
  "do ghazal": ["دو غزال", "Do Ghazal", "Doghazal"],
  // الكسيح
  kasih: ["الكسيح", "Al Kaseeh", "Al-Kaseeh", "Alkaseeh", "Kasih", "Kaseeh"],
  // عبيدو (not in original 71 list — still match products)
  abido: ["عبيدو", "Abido", "Abeedo", "Abeido", "أبيدو"],
  // بن الحموي
  "hamwi cafe": [
    "بن الحموي",
    "الحموي",
    "Hamwi",
    "Al Hamwi",
    "Bin Al Hamwi",
    "Hamwi Cafe",
  ],
  hamwi: ["بن الحموي", "الحموي", "Hamwi", "Al Hamwi"],
  // بن الشامي
  "alshami cafe": [
    "بن الشامي",
    "Al Shami",
    "Alshami",
    "Bin Al Shami",
    "AlShami Cafe",
  ],
  "al shami cafe": ["بن الشامي", "Al Shami", "Alshami", "Bin Al Shami"],
  alshami: ["بن الشامي", "Al Shami", "Alshami"],
  // بلدنا (may have no products yet)
  baladna: ["بلدنا", "Baladna", "Baladna Dairy"],
  // DURRA already works via catalog; keep extras for safety
  durra: ["الدرة", "درة", "Durra", "Al Durra", "Al-Durra", "Eldurra"],
  "al durra": ["الدرة", "درة", "Durra", "Al Durra"],
  // Common Latin logos already partially covered
  vimto: ["فيمتو", "Vimto"],
  barbican: ["بابريكان", "باربيكان", "Barbican"],
  kiri: ["كيري", "Kiri"],
  dana: ["دانا", "دانة", "Dana"],
  "al emlaq": ["العملاق", "Al Emlaq", "Al-Emlaq", "Alemlaq"],
  "chtoura garden": ["حدائق شتورة", "شتورة", "Chtoura", "Chtoura Garden"],
};

/** Aliases implied by a production logo display name. */
export function aliasesFromLogoName(brandName: string | null | undefined): string[] {
  const name = String(brandName || "").trim();
  if (!name) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (s: string) => {
    const t = s.trim();
    if (!t) return;
    const key = normalizeMatchText(t);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(t);
  };

  for (const candidate of logoNameCandidates(name)) {
    add(candidate);
    const mapped = LOGO_ALIAS_MAP[normalizeMatchText(candidate)];
    if (mapped) for (const a of mapped) add(a);
  }
  return out;
}
