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
  "الدرة": ["Durra", "Al Durra", "Al-Durra", "Eldurra", "AlDurra", "El Durra"],
  درة: ["Durra"],
  شمسين: ["Shamsin", "Chamsine", "Chamsin", "Shamseen"],
  دومو: ["Domo"],
  ديربي: ["Derby"],
  سنيكرز: ["Snickers"],
  لينا: ["Lina"],
  "غولدن تاتش": ["Golden Touch", "Goldentouch"],
  شوكس: ["Shockx", "Shocks", "ChocoX"],
  لذيذة: ["Laziza", "Lazeeza", "Lazeza"],
  راني: ["Rani"],
  "ماين تي": ["Mine Tea", "My Tea", "MinTea"],
  دانا: ["Dana"],
  دانة: ["Dana"],
  لارا: ["Lara"],
  "جبنة البقرة الضاحكة": [
    "The Laughing Cow",
    "Laughing Cow",
    "La Vache Qui Rit",
    "Vache Qui Rit",
  ],
  كيري: ["Kiri"],
  الراعي: ["Al Rai", "Al-Rai", "Picon", "Alrai"],
  هاجدو: ["Hajdu", "Hajdoo"],
  المختار: ["Al Mukhtar", "Al-Mukhtar", "Almukhtar"],
  بوك: ["Bok", "Puck"],
  ألتونسا: ["Altonsa", "Al Tonsa"],
  سنكويك: ["Sunqueak", "Sunquick", "Sun Quick", "Sun-Quick"],
  العرجاوي: ["Al Arjawi", "Al-Arjawi", "Arjawi"],
  فيمتو: ["Vimto"],
  موركورنو: ["Morecorno", "Morcorno"],
  كرزة: ["Karaza", "Keraza"],
  محمود: ["Mahmoud", "Mahmood"],
  أحمد: ["Ahmad", "Ahmed"],
  "دو غزال": ["Do Ghazal", "Doğuş", "Doghazal", "Do-Ghazal"],
  بابريكان: ["Barbican"],
  باربيكان: ["Barbican"],
  الفاخر: ["Al Fakher", "Al-Fakher", "Alfakher"],
  مازا: ["Maza"],
  هامول: ["Hamoul", "Hammoul"],
  العملاق: ["Al Emlaq", "Al-Emlaq", "Alemlaq"],
  "بن الحموي": ["Bin Al Hamwi", "Al Hamwi", "Alhamwi"],
  الكسيح: ["Al Kaseeh", "Al-Kaseeh", "Alkaseeh"],
  سومار: ["Somar", "Summar"],
  "بن الشامي": ["Bin Al Shami", "Al Shami", "Alshami"],
  أراميس: ["Aramis"],
  أمارين: ["Amarin"],
  "دكتور شيف": ["Doctor Chef", "Dr Chef", "Dr. Chef", "DrChef"],
  "سويت حمود": ["Sweet Hammoud", "Sweet Hamoud", "Sweethammoud"],
  كواليكو: ["Qualiko", "Qualico"],
  حمادة: ["Hamada", "Hammada"],
  ديمو: ["Demo", "Dimo"],
  الغوطة: ["Al Ghouta", "Al-Ghouta", "Alghouta"],
  ياقوري: ["Yagouri", "Yaguri", "Yaqouri"],
  لايلاند: ["Leyland", "Layland"],
  "سيتي كافيه": ["City Cafe", "City Café", "CityCafe"],
  نجار: ["Najjar", "Najar"],
  "بن الحسيب": ["Bin Al Haseeb", "Al Haseeb", "Alhaseeb"],
  "شيخ الكار": ["Sheikh Al Kar", "Sheikh Alkaar", "Sheik Al Kar"],
  خارطة: ["Kharta", "Kharita"],
  بيبوري: ["Pepori", "Bibori"],
  زوان: ["Zwan"],
  توسكا: ["Tosca"],
  كلبهار: ["Kalbahar", "Kolbahar"],
  بلبل: ["Bulbul"],
  "أرز الوزة": ["Wazza Rice", "Al Wazza", "Wazza", "Alwazza"],
  "أبو كاس": ["Abu Kas", "Abu Cass", "Abou Kas"],
  شهية: ["Shahia", "Shaheya", "Chahia"],
  الاسكا: ["Alaska"],
  "بلو ميل": ["Blue Mill", "Bluemill", "BlueMill"],
  هنا: ["Hana"],
  الأميرة: ["Al Ameera", "Al-Ameera", "Princess", "Alameera"],
  نبالي: ["Nabali"],
  "افاميا الشام": ["Afamia Al Sham", "Afamia", "Afamia Sham"],
  "حدائق شتورة": [
    "Chtoura Garden",
    "Chtoura Gardens",
    "Shtoura",
    "ChtouraGarden",
  ],
  شتورة: ["Chtoura", "Shtoura", "Chatura"],
  فرشلي: ["Freshly", "Freshli", "Freshley"],
  نسلة: ["Nestle", "Nestlé"],
  رنا: ["Rana"],
  إندومي: ["Indomie", "Indomi", "Indo Mie", "IndoMie"],
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
