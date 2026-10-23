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
  dates: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500",
  olive: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500",
};

/**
 * Lokale Ersatzdaten für die lokale Vorschau
 * (`LOCAL_PRODUCT_PREVIEW=1`), solange die Live-Abfrage
 * `supabase.from("products").select("*")` ausgesetzt ist.
 */
export const FALLBACK_PRODUCTS: Product[] = [
  product({
    id: "1",
    name: "تمر مجهول فاخر",
    nameDe: "Premium Medjool Datteln",
    price: 14.99,
    categoryId: "datteln",
    image: IMG.dates,
  }),
  product({
    id: "2",
    name: "زيت زيتون بكر ممتاز",
    nameDe: "Natives Olivenöl Extra",
    price: 18.5,
    categoryId: "oel",
    image: IMG.olive,
  }),
];

export const FALLBACK_CATEGORIES: Category[] = [
  { id: "datteln", name: "تمور", nameEn: "Datteln", image: IMG.dates, parentId: null, sortOrder: 1, children: [] },
  { id: "oel", name: "زيت", nameEn: "Öl", image: IMG.olive, parentId: null, sortOrder: 2, children: [] },
];
