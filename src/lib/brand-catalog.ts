/**
 * Kanonische Markenliste (Admin-intern).
 * `aliases` = Schreibvarianten (Arabisch + gängige Latein-Transkriptionen)
 * für automatisches Produkt-Matching. Kunde sieht nur Logos.
 */

export type BrandSeed = {
  /** Stabiler ID-Slug für brand_logos.id und /brands/:id */
  id: string;
  /** Anzeigename im Admin (kanonisch) */
  name: string;
  /** Alle Match-Varianten inkl. Slash-Aliasse */
  aliases: string[];
};

/** Rohliste aus Anforderung — „A / B“ = Aliasse derselben Marke */
const RAW_BRANDS: string[] = [
  "الدرة / درة",
  "شمسين",
  "دومو",
  "ديربي",
  "سنيكرز",
  "لينا",
  "غولدن تاتش",
  "شوكس",
  "لذيذة",
  "راني",
  "ماين تي",
  "دانا / دانة",
  "لارا",
  "جبنة البقرة الضاحكة",
  "كيري",
  "الراعي",
  "هاجدو",
  "المختار",
  "بوك",
  "ألتونسا",
  "سنكويك",
  "العرجاوي",
  "فيمتو",
  "موركورنو",
  "كرزة",
  "محمود",
  "أحمد",
  "دو غزال",
  "بابريكان / باربيكان",
  "الفاخر",
  "مازا",
  "هامول",
  "العملاق",
  "بن الحموي",
  "الكسيح",
  "سومار",
  "بن الشامي",
  "أراميس",
  "أمارين",
  "دكتور شيف",
  "سويت حمود",
  "كواليكو",
  "حمادة",
  "ديمو",
  "الغوطة",
  "ياقوري",
  "لايلاند",
  "سيتي كافيه",
  "نجار",
  "بن الحسيب",
  "شيخ الكار",
  "خارطة",
  "بيبوري",
  "زوان",
  "توسكا",
  "كلبهار",
  "بلبل",
  "أرز الوزة",
  "أبو كاس",
  "شهية",
  "الاسكا",
  "بلو ميل",
  "هنا",
  "الأميرة",
  "نبالي",
  "افاميا الشام",
  "حدائق شتورة / شتورة",
  "فرشلي",
  "نسلة",
  "رنا",
  "إندومي",
];

/** Zusätzliche Latein-/Marken-Aliasse für Matching */
const EXTRA_LATIN: Record<string, string[]> = {
  "الدرة": ["Durra", "Al Durra", "Al-Durra", "Eldurra"],
  درة: ["Durra"],
  شمسين: ["Shamsin", "Chamsine"],
  دومو: ["Domo"],
  ديربي: ["Derby"],
  سنيكرز: ["Snickers"],
  لينا: ["Lina"],
  "غولدن تاتش": ["Golden Touch"],
  شوكس: ["Shockx", "Shocks"],
  لذيذة: ["Laziza", "Lazeeza"],
  راني: ["Rani"],
  "ماين تي": ["Mine Tea", "My Tea"],
  دانا: ["Dana"],
  دانة: ["Dana"],
  لارا: ["Lara"],
  "جبنة البقرة الضاحكة": ["The Laughing Cow", "Laughing Cow", "La Vache Qui Rit"],
  كيري: ["Kiri"],
  الراعي: ["Al Rai", "Al-Rai", "Picon"],
  هاجدو: ["Hajdu", "Hajdoo"],
  المختار: ["Al Mukhtar", "Al-Mukhtar"],
  بوك: ["Bok", "Puck"],
  ألتونسا: ["Altonsa"],
  سنكويك: ["Sunqueak", "Sunquick", "Sun Quick"],
  العرجاوي: ["Al Arjawi", "Al-Arjawi"],
  فيمتو: ["Vimto"],
  موركورنو: ["Morecorno"],
  كرزة: ["Karaza", "Keraza"],
  محمود: ["Mahmoud"],
  أحمد: ["Ahmad", "Ahmed"],
  "دو غزال": ["Do Ghazal", "Doğuş"],
  بابريكان: ["Barbican"],
  باربيكان: ["Barbican"],
  الفاخر: ["Al Fakher", "Al-Fakher", "Alfakher"],
  مازا: ["Maza"],
  هامول: ["Hamoul"],
  العملاق: ["Al Emlaq", "Al-Emlaq"],
  "بن الحموي": ["Bin Al Hamwi", "Al Hamwi"],
  الكسيح: ["Al Kaseeh", "Al-Kaseeh"],
  سومار: ["Somar"],
  "بن الشامي": ["Bin Al Shami", "Al Shami"],
  أراميس: ["Aramis"],
  أمارين: ["Amarin"],
  "دكتور شيف": ["Doctor Chef", "Dr Chef", "Dr. Chef"],
  "سويت حمود": ["Sweet Hammoud", "Sweet Hamoud"],
  كواليكو: ["Qualiko"],
  حمادة: ["Hamada"],
  ديمو: ["Demo", "Dimo"],
  الغوطة: ["Al Ghouta", "Al-Ghouta"],
  ياقوري: ["Yagouri", "Yaguri"],
  لايلاند: ["Leyland"],
  "سيتي كافيه": ["City Cafe", "City Café"],
  نجار: ["Najjar"],
  "بن الحسيب": ["Bin Al Haseeb", "Al Haseeb"],
  "شيخ الكار": ["Sheikh Al Kar"],
  خارطة: ["Kharta"],
  بيبوري: ["Pepori"],
  زوان: ["Zwan"],
  توسكا: ["Tosca"],
  كلبهار: ["Kalbahar"],
  بلبل: ["Bulbul"],
  "أرز الوزة": ["Wazza Rice", "Al Wazza", "Wazza"],
  "أبو كاس": ["Abu Kas", "Abu Cass"],
  شهية: ["Shahia", "Shaheya"],
  الاسكا: ["Alaska"],
  "بلو ميل": ["Blue Mill", "Bluemill"],
  هنا: ["Hana"],
  الأميرة: ["Al Ameera", "Al-Ameera", "Princess"],
  نبالي: ["Nabali"],
  "افاميا الشام": ["Afamia Al Sham", "Afamia"],
  "حدائق شتورة": ["Chtoura Garden", "Chtoura Gardens", "Shtoura"],
  شتورة: ["Chtoura", "Shtoura"],
  فرشلي: ["Freshly", "Freshli"],
  نسلة: ["Nestle", "Nestlé"],
  رنا: ["Rana"],
  إندومي: ["Indomie", "Indomi"],
};

function splitAliases(raw: string): string[] {
  return raw
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);
}

function slugifyBrand(primary: string, index: number): string {
  const map: Record<string, string> = {
    الدرة: "aldurra",
    شمسين: "shamsin",
    دومو: "domo",
    ديربي: "derby",
    سنيكرز: "snickers",
    لينا: "lina",
    "غولدن تاتش": "golden-touch",
    شوكس: "shockx",
    لذيذة: "laziza",
    راني: "rani",
    "ماين تي": "mine-tea",
    دانا: "dana",
    لارا: "lara",
    "جبنة البقرة الضاحكة": "laughing-cow",
    كيري: "kiri",
    الراعي: "al-rai",
    هاجدو: "hajdu",
    المختار: "al-mukhtar",
    بوك: "puck",
    ألتونسا: "altonsa",
    سنكويك: "sunquick",
    العرجاوي: "al-arjawi",
    فيمتو: "vimto",
    موركورنو: "morecorno",
    كرزة: "keraza",
    محمود: "mahmoud",
    أحمد: "ahmad",
    "دو غزال": "do-ghazal",
    بابريكان: "barbican",
    الفاخر: "al-fakher",
    مازا: "maza",
    هامول: "hamoul",
    العملاق: "al-emlaq",
    "بن الحموي": "bin-al-hamwi",
    الكسيح: "al-kaseeh",
    سومار: "somar",
    "بن الشامي": "bin-al-shami",
    أراميس: "aramis",
    أمارين: "amarin",
    "دكتور شيف": "doctor-chef",
    "سويت حمود": "sweet-hammoud",
    كواليكو: "qualiko",
    حمادة: "hamada",
    ديمو: "dimo",
    الغوطة: "al-ghouta",
    ياقوري: "yagouri",
    لايلاند: "leyland",
    "سيتي كافيه": "city-cafe",
    نجار: "najjar",
    "بن الحسيب": "bin-al-haseeb",
    "شيخ الكار": "sheikh-al-kar",
    خارطة: "kharta",
    بيبوري: "pepori",
    زوان: "zwan",
    توسكا: "tosca",
    كلبهار: "kalbahar",
    بلبل: "bulbul",
    "أرز الوزة": "wazza-rice",
    "أبو كاس": "abu-kas",
    شهية: "shahia",
    الاسكا: "alaska",
    "بلو ميل": "blue-mill",
    هنا: "hana",
    الأميرة: "al-ameera",
    نبالي: "nabali",
    "افاميا الشام": "afamia-al-sham",
    "حدائق شتورة": "chtoura-garden",
    فرشلي: "freshly",
    نسلة: "nestle",
    رنا: "rana",
    إندومي: "indomie",
  };
  const slug = map[primary] || `brand-${index + 1}`;
  return `brand-${slug}`;
}

function uniqueAliases(parts: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const t = p.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

export const BRAND_CATALOG: BrandSeed[] = RAW_BRANDS.map((raw, index) => {
  const parts = splitAliases(raw);
  const primary = parts[0];
  const latin: string[] = [];
  for (const p of parts) {
    const extras = EXTRA_LATIN[p];
    if (extras) latin.push(...extras);
  }
  return {
    id: slugifyBrand(primary, index),
    name: primary,
    aliases: uniqueAliases([...parts, ...latin]),
  };
});

export function brandCatalogCount(): number {
  return BRAND_CATALOG.length;
}
