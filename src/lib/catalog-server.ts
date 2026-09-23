import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { discountedPrice } from "@/lib/pricing";
import type { Category, Product } from "@/types";

const PLACEHOLDER_IMAGE = "/placeholder.svg";

const PUBLIC_SELECT =
  "id, name_ar, name_de, description, price, currency, category_id, image, images, ingredients, allergens, origin_country, weight_value, weight_unit, best_before_note, vat_rate, discount_percent, barcode, max_order_quantity, stock_quantity, deleted_at, created_at";

type PublicRow = {
  id: string;
  name_ar?: string | null;
  name_de?: string | null;
  description?: string | null;
  price?: number | string | null;
  category_id?: string | null;
  image?: string | null;
  images?: string[] | null;
  ingredients?: string | null;
  allergens?: string | null;
  origin_country?: string | null;
  weight_value?: number | null;
  weight_unit?: string | null;
  best_before_note?: string | null;
  vat_rate?: number | null;
  discount_percent?: number | null;
  barcode?: string | null;
  max_order_quantity?: number | null;
  stock_quantity?: number | null;
};

type CategoryRow = {
  id: string;
  name_ar?: string | null;
  name_de?: string | null;
  image?: string | null;
  parent_id?: string | null;
  sort_order?: number | null;
};

export function mapPublicProduct(row: PublicRow): Product {
  const listPrice = Number(row.price ?? 0);
  const discount = Number(row.discount_percent ?? 0);
  const stock = Number(row.stock_quantity ?? 0);
  const gallery = Array.isArray(row.images) ? row.images.filter(Boolean) : [];
  const image = row.image || gallery[0] || PLACEHOLDER_IMAGE;
  const uniqueImages = Array.from(new Set([image, ...gallery].filter(Boolean)));

  return {
    id: row.id,
    name: row.name_ar || row.name_de || "",
    nameDe: row.name_de || undefined,
    description: row.description ?? "",
    price: discountedPrice(listPrice, discount),
    originalPrice: discount > 0 ? listPrice : undefined,
    discountPercent: discount,
    vatRate: Number(row.vat_rate ?? 19),
    categoryId: row.category_id ?? "",
    image,
    images: uniqueImages,
    stock,
    inStock: stock > 0,
    weightValue: row.weight_value ?? null,
    weightUnit: row.weight_unit || "g",
    barcode: row.barcode ?? null,
    maxOrderQuantity: Number(row.max_order_quantity ?? 10),
    ingredients: row.ingredients ?? "",
    allergens: row.allergens ?? "",
    originCountry: row.origin_country ?? "",
    bestBeforeNote: row.best_before_note ?? "",
  };
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name_ar || row.name_de || "",
    nameEn: row.name_de || "",
    image: row.image || PLACEHOLDER_IMAGE,
    parentId: row.parent_id ?? null,
    sortOrder: row.sort_order ?? 0,
  };
}

export function nestCategories(flat: Category[]): Category[] {
  const byId = new Map(flat.map((c) => [c.id, { ...c, children: [] as Category[] }]));
  const roots: Category[] = [];
  for (const cat of byId.values()) {
    if (cat.parentId && byId.has(cat.parentId)) {
      byId.get(cat.parentId)!.children!.push(cat);
    } else {
      roots.push(cat);
    }
  }
  const sortFn = (a: Category, b: Category) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  const walk = (nodes: Category[]) => {
    nodes.sort(sortFn);
    nodes.forEach((n) => n.children && walk(n.children));
  };
  walk(roots);
  return roots;
}

async function fetchPublicProducts(options?: {
  id?: string;
  categoryId?: string;
}): Promise<Product[]> {
  const supabase = await createClient();
  let query = supabase.from("products_public").select(PUBLIC_SELECT);

  if (options?.id) query = query.eq("id", options.id);
  if (options?.categoryId) query = query.eq("category_id", options.categoryId);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error || !data) {
    console.error("[catalog] products_public:", error?.message);
    return [];
  }
  return (data as PublicRow[]).map(mapPublicProduct);
}

export const getCategoriesAsync = cache(async (): Promise<Category[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name_ar, name_de, image, parent_id, sort_order, deleted_at")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if (error || !data) {
    console.error("[catalog] categories:", error?.message);
    return [];
  }
  return nestCategories((data as CategoryRow[]).map(mapCategory));
});

export const getFlatCategoriesAsync = cache(async (): Promise<Category[]> => {
  const tree = await getCategoriesAsync();
  const flat: Category[] = [];
  const walk = (nodes: Category[]) => {
    for (const n of nodes) {
      flat.push(n);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(tree);
  return flat;
});

export const getCategoryByIdAsync = cache(
  async (id: string): Promise<Category | undefined> => {
    const all = await getFlatCategoriesAsync();
    return all.find((c) => c.id === id);
  }
);

export const getProductsAsync = cache(async (): Promise<Product[]> => {
  return fetchPublicProducts();
});

export const getFeaturedProductsAsync = cache(async (): Promise<Product[]> => {
  const products = await getProductsAsync();
  const offers = products.filter((p) => p.discountPercent > 0);
  return offers.length ? offers : products.slice(0, 8);
});

export const getProductByIdAsync = cache(
  async (id: string): Promise<Product | undefined> => {
    const rows = await fetchPublicProducts({ id });
    return rows[0];
  }
);

export const getProductsByCategoryAsync = cache(
  async (categoryId: string): Promise<Product[]> => {
    const tree = await getCategoriesAsync();
    const ids = new Set<string>();
    const walk = (nodes: Category[], capturing: boolean) => {
      for (const n of nodes) {
        const cap = capturing || n.id === categoryId;
        if (cap) ids.add(n.id);
        if (n.children?.length) walk(n.children, cap);
      }
    };
    walk(tree, false);
    const products = await getProductsAsync();
    return products.filter((p) => ids.has(p.categoryId));
  }
);
