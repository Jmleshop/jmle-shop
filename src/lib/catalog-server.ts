import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { discountedPrice } from "@/lib/pricing";
import { searchQueryVariants } from "@/lib/search";
import {
  DEFAULT_HERO_SLIDES,
  DEFAULT_SITE_CONFIG,
} from "@/lib/site-defaults";
import {
  SALE_CATEGORY,
  collectCategoryAndDescendantIds,
  isSaleCategory,
  isSaleCategoryId,
  isSaleCategoryName,
  productIsOnSale,
} from "@/lib/category-special";
import type { Category, Product, SiteConfig, Slide } from "@/types";

const PLACEHOLDER_IMAGE = "/placeholder.svg";
const REVALIDATE_SECONDS = 60;

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
    id: String(row.id),
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
    maxOrderQuantity:
      row.max_order_quantity == null || Number(row.max_order_quantity) <= 0
        ? null
        : Number(row.max_order_quantity),
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
  const byId = new Map(
    flat.map((c) => [c.id, { ...c, children: [] as Category[] }])
  );
  const roots: Category[] = [];
  for (const cat of byId.values()) {
    if (cat.parentId && byId.has(cat.parentId)) {
      byId.get(cat.parentId)!.children!.push(cat);
    } else {
      roots.push(cat);
    }
  }
  const sortFn = (a: Category, b: Category) =>
    (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  const walk = (nodes: Category[]) => {
    nodes.sort(sortFn);
    nodes.forEach((n) => n.children && walk(n.children));
  };
  walk(roots);
  return roots;
}

/**
 * Lädt den öffentlichen Katalog mit mehrstufigem Fallback, damit Produkte
 * IMMER erscheinen — unabhängig von fehlender View oder RLS-Konfiguration:
 *   1) View `products_public` über anon (bevorzugt, schlanke Public-Spalten)
 *   2) Basistabelle `products` über anon (falls View fehlt/leer)
 *   3) Basistabelle `products` über Service-Role (umgeht RLS; nur serverseitig)
 */
async function fetchAllPublicProducts(): Promise<Product[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products_public")
    .select(PUBLIC_SELECT)
    .order("created_at", { ascending: false });

  if (!error && data && data.length > 0) {
    return (data as PublicRow[]).map(mapPublicProduct);
  }

  if (error) {
    console.error(
      "[catalog] products_public nicht verfügbar:",
      error.message,
      "→ Fallback auf Basistabelle products (anon)"
    );
  }

  // Stufe 2: anon direkt auf die Basistabelle (RLS lässt aktive Produkte zu)
  const anonRows = await fetchProductsFromBaseTable(false);
  if (anonRows.length > 0) return anonRows;

  // Stufe 3: Service-Role umgeht RLS komplett (z. B. wenn keine Public-Policy
  // gesetzt ist). Läuft ausschließlich serverseitig, Key gelangt nie zum Client.
  return fetchProductsFromBaseTable(true);
}

async function fetchProductsFromBaseTable(
  useServiceRole: boolean
): Promise<Product[]> {
  let supabase;
  if (useServiceRole) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return [];
    try {
      const { createServiceClient } = await import("@/lib/supabase/admin");
      supabase = createServiceClient();
    } catch (e) {
      console.error("[catalog] Service-Role-Client nicht verfügbar:", e);
      return [];
    }
  } else {
    supabase = createPublicClient();
  }

  // select("*") ist robust gegen fehlende Spalten in älteren Schemas.
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error(
      `[catalog] products (${useServiceRole ? "service-role" : "anon"} Fallback):`,
      error?.message
    );
    return [];
  }

  return (data as Array<PublicRow & { status?: string | null }>)
    .filter((row) => {
      // Nur veröffentlichte Produkte; fehlende status-Spalte = veröffentlicht.
      const status = row.status;
      return status == null || status === "published";
    })
    .map(mapPublicProduct);
}

async function fetchAllCategories(): Promise<Category[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name_ar, name_de, image, parent_id, sort_order, deleted_at")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if (error || !data) {
    console.error("[catalog] categories:", error?.message);
    return [];
  }
  return nestCategories(
    (data as CategoryRow[])
      .map(mapCategory)
      // Echte DB-„Sale“-Kategorien ausblenden → nur virtuelle /categories/sale
      .filter((c) => !isSaleCategoryName(c.name, c.nameEn))
  );
}

async function fetchSiteConfig(): Promise<SiteConfig> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "site")
    .maybeSingle();

  if (error || !data?.value) {
    if (error && !/relation|does not exist|42P01/i.test(error.message)) {
      console.error("[catalog] site_settings:", error.message);
    }
    return DEFAULT_SITE_CONFIG;
  }

  const v = data.value as Partial<SiteConfig>;
  return {
    ...DEFAULT_SITE_CONFIG,
    ...v,
    name: v.name || DEFAULT_SITE_CONFIG.name,
    tagline: v.tagline || DEFAULT_SITE_CONFIG.tagline,
  };
}

async function fetchHeroSlides(): Promise<Slide[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("hero_slides")
    .select("id, image, title, subtitle, sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error || !data?.length) {
    if (error && !/relation|does not exist|42P01/i.test(error.message)) {
      console.error("[catalog] hero_slides:", error.message);
    }
    return DEFAULT_HERO_SLIDES;
  }

  return data.map((row) => ({
    id: String(row.id),
    image: String(row.image),
    title: String(row.title),
    subtitle: String(row.subtitle ?? ""),
  }));
}

const getCategoriesCached = unstable_cache(
  fetchAllCategories,
  ["catalog-categories-v2"],
  { revalidate: REVALIDATE_SECONDS, tags: ["catalog", "categories"] }
);

const getSiteConfigCached = unstable_cache(
  fetchSiteConfig,
  ["catalog-site-v1"],
  { revalidate: REVALIDATE_SECONDS, tags: ["catalog", "site"] }
);

const getSlidesCached = unstable_cache(
  fetchHeroSlides,
  ["catalog-slides-v1"],
  { revalidate: REVALIDATE_SECONDS, tags: ["catalog", "slides"] }
);

/**
 * Produkte werden bewusst NICHT über unstable_cache zwischengespeichert, damit
 * frisch in die DB importierte Produkte sofort sichtbar sind. `cache` dedupt
 * lediglich innerhalb eines einzelnen Requests.
 */
export const getProductsAsync = cache(async (): Promise<Product[]> => {
  return fetchAllPublicProducts();
});

export const getCategoriesAsync = cache(async (): Promise<Category[]> => {
  const tree = await getCategoriesCached();
  // Virtuelle Sale-Kategorie an den Anfang (Produkte kommen dynamisch über Rabatt)
  const sale: Category = {
    id: SALE_CATEGORY.id,
    name: SALE_CATEGORY.name,
    nameEn: SALE_CATEGORY.nameEn,
    image: SALE_CATEGORY.image,
    parentId: null,
    sortOrder: SALE_CATEGORY.sortOrder,
    children: [],
  };
  return [sale, ...tree];
});

export const getSiteConfigAsync = cache(async (): Promise<SiteConfig> => {
  return getSiteConfigCached();
});

export const getSlidesAsync = cache(async (): Promise<Slide[]> => {
  return getSlidesCached();
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
    if (isSaleCategoryId(id)) {
      return {
        id: SALE_CATEGORY.id,
        name: SALE_CATEGORY.name,
        nameEn: SALE_CATEGORY.nameEn,
        image: SALE_CATEGORY.image,
        parentId: null,
        sortOrder: SALE_CATEGORY.sortOrder,
        children: [],
      };
    }

    const all = await getFlatCategoriesAsync();
    const hit = all.find((c) => c.id === id);
    if (hit) return hit;

    // DB-Kategorie „Sale“/العروض (aus dem Baum ausgeblendet) → virtuelle Sale
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("categories")
      .select("id, name_ar, name_de, image, parent_id, sort_order")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (
      data &&
      isSaleCategoryName(data.name_ar, data.name_de)
    ) {
      return {
        id: SALE_CATEGORY.id,
        name: SALE_CATEGORY.name,
        nameEn: SALE_CATEGORY.nameEn,
        image: data.image || SALE_CATEGORY.image,
        parentId: null,
        sortOrder: SALE_CATEGORY.sortOrder,
        children: [],
      };
    }

    return undefined;
  }
);

export const getFeaturedProductsAsync = cache(async (): Promise<Product[]> => {
  const products = await getProductsAsync();
  const offers = products.filter(productIsOnSale);
  return offers.length ? offers : products.slice(0, 8);
});

export const getProductByIdAsync = cache(
  async (id: string): Promise<Product | undefined> => {
    const products = await getProductsAsync();
    const hit = products.find((p) => p.id === id);
    if (hit) return hit;

    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("products_public")
      .select(PUBLIC_SELECT)
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return undefined;
    return mapPublicProduct(data as PublicRow);
  }
);

export const getProductsByCategoryAsync = cache(
  async (categoryId: string): Promise<Product[]> => {
    const products = await getProductsAsync();
    // products_public: nur deleted_at IS NULL & published

    const flat = await getFlatCategoriesAsync();
    const cat = flat.find((c) => c.id === categoryId);

    let treatAsSale =
      isSaleCategoryId(categoryId) || (cat != null && isSaleCategory(cat));

    // Gefilterte DB-Sale-Kategorie (UUID) erkennen
    if (!treatAsSale && !cat) {
      const supabase = createPublicClient();
      const { data } = await supabase
        .from("categories")
        .select("name_ar, name_de")
        .eq("id", categoryId)
        .is("deleted_at", null)
        .maybeSingle();
      if (data && isSaleCategoryName(data.name_ar, data.name_de)) {
        treatAsSale = true;
      }
    }

    if (treatAsSale) {
      // Schema: discount_percent > 0 ⇒ effective price < list price
      // (kein discount_price-Feld; gelöschte Produkte bereits ausgeschlossen)
      return products.filter(productIsOnSale);
    }

    const realFlat = flat.filter((c) => !isSaleCategory(c));
    const ids = collectCategoryAndDescendantIds(categoryId, realFlat);

    if (ids.size <= 1) {
      const tree = await getCategoriesAsync();
      const walk = (nodes: Category[], capturing: boolean) => {
        for (const n of nodes) {
          if (isSaleCategory(n)) continue;
          const cap = capturing || n.id === categoryId;
          if (cap) ids.add(n.id);
          if (n.children?.length) walk(n.children, cap);
        }
      };
      walk(tree, false);
    }

    return products.filter((p) => p.categoryId && ids.has(p.categoryId));
  }
);

/**
 * Live-Suche: bevorzugt RPC search_products_public, Fallback ILIKE / In-Memory.
 */
export async function searchProductsAsync(
  query: string,
  limit = 24
): Promise<Product[]> {
  const q = query.trim();
  if (!q) {
    const all = await getProductsAsync();
    return all.slice(0, limit);
  }

  const supabase = createPublicClient();
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "search_products_public",
    { p_query: q, p_limit: limit }
  );

  if (!rpcError && Array.isArray(rpcData)) {
    return (rpcData as PublicRow[]).map(mapPublicProduct);
  }

  const variants = searchQueryVariants(q);
  const orFilter = variants
    .flatMap((v) => {
      const esc = v.replace(/%/g, "").replace(/,/g, "");
      return [
        `name_ar.ilike.%${esc}%`,
        `name_de.ilike.%${esc}%`,
        `description.ilike.%${esc}%`,
        `ingredients.ilike.%${esc}%`,
        `origin_country.ilike.%${esc}%`,
      ];
    })
    .join(",");

  const { data, error } = await supabase
    .from("products_public")
    .select(PUBLIC_SELECT)
    .or(orFilter)
    .limit(limit);

  if (!error && data) {
    return (data as PublicRow[]).map(mapPublicProduct);
  }

  // Letzter Fallback: gecachter Katalog + Client-Normalisierung
  const { normalizeArabicSearch } = await import("@/lib/search");
  const needle = normalizeArabicSearch(q);
  const all = await getProductsAsync();
  return all
    .filter((p) => {
      const hay = normalizeArabicSearch(
        `${p.name} ${p.nameDe ?? ""} ${p.description} ${p.ingredients ?? ""} ${p.originCountry ?? ""}`
      );
      return hay.includes(needle);
    })
    .slice(0, limit);
}
