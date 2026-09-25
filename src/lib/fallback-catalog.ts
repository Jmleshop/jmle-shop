import type { Category, Product } from "@/types";

/**
 * Statischer Fallback-Katalog. Wird verwendet, wenn die Datenbank (noch) keine
 * Produkte/Kategorien liefert (z. B. RLS-Sperre oder leerer Import), damit die
 * Startseite, die Auto-Reihen und das Grid nie leer sind.
 */

function product(p: Partial<Product> & { id: string; name: string; price: number }): Product {
  const image = p.image ?? "";
  return {
    id: p.id,
    name: p.name,
    nameDe: p.nameDe,
    description: p.description ?? "",
    price: p.price,
    originalPrice: p.originalPrice,
    discountPercent: p.discountPercent ?? 0,
    vatRate: p.vatRate ?? 7,
    categoryId: p.categoryId ?? "",
    image,
    images: p.images ?? (image ? [image] : []),
    featured: p.featured,
    stock: p.stock ?? 25,
    active: true,
    inStock: (p.stock ?? 25) > 0,
    weightValue: p.weightValue ?? null,
    weightUnit: p.weightUnit ?? "g",
    barcode: p.barcode ?? null,
    maxOrderQuantity: p.maxOrderQuantity ?? 10,
    ingredients: p.ingredients ?? "",
    allergens: p.allergens ?? "",
    originCountry: p.originCountry ?? "",
    bestBeforeNote: p.bestBeforeNote ?? "",
    badges: p.badges ?? [],
    customNote: p.customNote ?? "",
  };
}

const IMG = {
  spices: "https://images.unsplash.com/photo-1596040033229-a0b517a33173?w=600&q=80",
  turmeric: "https://images.unsplash.com/photo-1615485290381-4418754e774e?w=600&q=80",
  basmati: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80",
  egyptrice: "https://images.unsplash.com/photo-1536304997881-876e53ea1e0a?w=600&q=80",
  olive: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80",
  sesameoil: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=600&q=80",
  labneh: "https://images.unsplash.com/photo-1488477181941-6428a0291777?w=600&q=80",
  lentils: "https://images.unsplash.com/photo-1515543900108-63f1658a8c74?w=600&q=80",
  baklava: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80",
  tahini: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=80",
};

/** Rabatt-Produkte (obere Reihe) + reguläre Produkte (untere Reihe). */
export const FALLBACK_PRODUCTS: Product[] = [
  // --- Angebote (mit Rabatt / Streichpreis) ---
  product({ id: "demo-spices-7", name: "بهار سبعة أصناف", nameDe: "Sieben-Gewürze-Mischung", price: 4.99, originalPrice: 6.99, discountPercent: 29, categoryId: "spices", image: IMG.spices, badges: ["bestseller"], customNote: "وصل حديثاً" }),
  product({ id: "demo-basmati", name: "أرز بسمتي ممتاز", nameDe: "Basmati Reis", price: 8.99, originalPrice: 11.99, discountPercent: 25, categoryId: "rice", image: IMG.basmati }),
  product({ id: "demo-olive", name: "زيت زيتون بكر ممتاز", nameDe: "Natives Olivenöl", price: 12.99, originalPrice: 15.99, discountPercent: 19, categoryId: "oils", image: IMG.olive, badges: ["quality"] }),
  product({ id: "demo-baklava", name: "بقلاوة فاخرة", nameDe: "Baklava", price: 14.99, originalPrice: 18.99, discountPercent: 21, categoryId: "sweets", image: IMG.baklava, badges: ["bestseller"] }),
  product({ id: "demo-turmeric", name: "كركم هندي فاخر", nameDe: "Kurkuma", price: 3.49, originalPrice: 4.99, discountPercent: 30, categoryId: "spices", image: IMG.turmeric }),
  // --- Reguläre / neueste Produkte (ohne Rabatt) ---
  product({ id: "demo-egyptrice", name: "أرز مصري أبيض", nameDe: "Ägyptischer Reis", price: 5.49, categoryId: "rice", image: IMG.egyptrice }),
  product({ id: "demo-labneh", name: "لبنة بلدية", nameDe: "Labneh", price: 3.99, categoryId: "dairy", image: IMG.labneh }),
  product({ id: "demo-lentils", name: "عدس أحمر", nameDe: "Rote Linsen", price: 2.49, categoryId: "legumes", image: IMG.lentils }),
  product({ id: "demo-tahini", name: "طحينة سمسم", nameDe: "Tahini", price: 4.49, categoryId: "canned", image: IMG.tahini }),
  product({ id: "demo-sesameoil", name: "زيت سمسم محمص", nameDe: "Sesamöl", price: 7.99, categoryId: "oils", image: IMG.sesameoil, customNote: "منتج جديد" }),
];

export const FALLBACK_CATEGORIES: Category[] = [
  { id: "spices", name: "بهارات", nameEn: "Gewürze", image: IMG.spices, parentId: null, sortOrder: 1, children: [] },
  { id: "rice", name: "أرز", nameEn: "Reis", image: IMG.basmati, parentId: null, sortOrder: 2, children: [] },
  { id: "oils", name: "زيوت", nameEn: "Öle", image: IMG.olive, parentId: null, sortOrder: 3, children: [] },
  { id: "dairy", name: "ألبان", nameEn: "Milchprodukte", image: IMG.labneh, parentId: null, sortOrder: 4, children: [] },
  { id: "legumes", name: "بقوليات", nameEn: "Hülsenfrüchte", image: IMG.lentils, parentId: null, sortOrder: 5, children: [] },
  { id: "sweets", name: "حلويات", nameEn: "Süßigkeiten", image: IMG.baklava, parentId: null, sortOrder: 6, children: [] },
  { id: "canned", name: "معلبات", nameEn: "Konserven", image: IMG.tahini, parentId: null, sortOrder: 7, children: [] },
];
