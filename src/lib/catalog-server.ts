import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { discountedPrice } from "@/lib/pricing";
import { normalizeBadges } from "@/lib/product-badges";
import { FALLBACK_CATEGORIES, FALLBACK_PRODUCTS } from "@/lib/fallback-catalog";
import { searchQueryVariants } from "@/lib/search";
import {
  DEFAULT_HERO_SLIDES,
  DEFAULT_SITE_CONFIG,
} from "@/lib/site-defaults";
import { normalizeHomepageSections } from "@/lib/homepage-sections";
import {
  ALL_CATEGORY,
  SALE_CATEGORY,
  collectCategoryAndDescendantIds,
  isAllCategory,
  isAllCategoryId,
  isSaleCategory,
  isSaleCategoryId,
  isSaleCategoryName,
  productIsOnSale,
} from "@/lib/category-special";
import { originalImageSrc } from "@/lib/sharp-image";
import type {
  BrandLogo,
  Category,
  HomepageSection,
  Product,
  SiteConfig,
  Slide,
  SlideMediaType,
  SliderZone,
} from "@/types";

const PLACEHOLDER_IMAGE = "/placeholder.svg";
const REVALIDATE_SECONDS = 60;

const PUBLIC_SELECT =
  "id, name_ar, name_de, description, price, currency, category_id, image, images, ingredients, allergens, origin_country, weight_value, weight_unit, gross_weight_value, gross_weight_unit, best_before_note, vat_rate, discount_percent, barcode, max_order_quantity, stock_quantity, badges, custom_note, deleted_at, created_at";

/** Fallback ohne Spalten, die in älteren products_public Views fehlen können */
const PUBLIC_SELECT_BASIC =
  "id, name_ar, name_de, description, price, currency, category_id, image, images, ingredients, allergens, origin_country, weight_value, weight_unit, best_before_note, vat_rate, discount_percent, barcode, max_order_quantity, stock_quantity, badges, custom_note, deleted_at, created_at";

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
  gross_weight_value?: number | null;
  gross_weight_unit?: string | null;
  best_before_note?: string | null;
  vat_rate?: number | null;
  discount_percent?: number | null;
  barcode?: string | null;
  max_order_quantity?: number | null;
  stock_quantity?: number | null;
  badges?: unknown;
  custom_note?: string | null;
};

type CategoryRow = {
  id: string;
  name_ar?: string | null;
  name_de?: string | null;
  image?: string | null;
  parent_id?: string | null;
  sort_order?: number | null;
  show_on_homepage?: boolean | null;
};

type HeroSlideRow = {
  id: string;
  image?: string | null;
  title?: string | null;
  subtitle?: string | null;
  title_ar?: string | null;
  title_de?: string | null;
  subtitle_ar?: string | null;
  subtitle_de?: string | null;
  link_url?: string | null;
  link_category_id?: string | null;
  slider_zone?: string | null;
  sort_order?: number | null;
  active?: boolean | null;
  media_type?: string | null;
  video_url?: string | null;
  product_id?: string | null;
  interactive_style?: string | null;
};

type BrandLogoRow = {
  id: string;
  name?: string | null;
  image?: string | null;
  link_url?: string | null;
  sort_order?: number | null;
  active?: boolean | null;
};

export function mapPublicProduct(row: PublicRow): Product {
  const listPrice = Number(row.price ?? 0);
  const discount = Number(row.discount_percent ?? 0);
  const stock = Number(row.stock_quantity ?? 0);
  const gallery = Array.isArray(row.images) ? row.images.filter(Boolean) : [];
  const image = originalImageSrc(row.image || gallery[0] || PLACEHOLDER_IMAGE);
  const uniqueImages = Array.from(
    new Set([image, ...gallery.map((item) => originalImageSrc(item))].filter(Boolean))
  );

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
    grossWeightValue: row.gross_weight_value ?? null,
    grossWeightUnit: row.gross_weight_unit || "g",
    barcode: row.barcode ?? null,
    maxOrderQuantity:
      row.max_order_quantity == null || Number(row.max_order_quantity) <= 0
        ? null
        : Number(row.max_order_quantity),
    ingredients: row.ingredients ?? "",
    allergens: row.allergens ?? "",
    originCountry: row.origin_country ?? "",
    bestBeforeNote: row.best_before_note ?? "",
    badges: normalizeBadges(row.badges),
    customNote: row.custom_note ?? "",
  };
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name_ar || row.name_de || "",
    nameEn: row.name_de || "",
    image: originalImageSrc(row.image || PLACEHOLDER_IMAGE),
    parentId: row.parent_id ?? null,
    sortOrder: row.sort_order ?? 0,
    showOnHomepage: row.show_on_homepage !== false,
  };
}

function mapSliderZone(raw?: string | null): SliderZone {
  const zone = String(raw ?? "").trim();
  return zone || "banner1";
}

function mapMediaType(raw?: string | null): SlideMediaType {
  if (
    raw === "video" ||
    raw === "parallax" ||
    raw === "product_card"
  ) {
    return raw;
  }
  return "image";
}

function mapHeroSlide(row: HeroSlideRow): Slide {
  const titleAr = String(row.title_ar || row.title || "");
  const titleDe = String(row.title_de || "");
  const subtitleAr = String(row.subtitle_ar || row.subtitle || "");
  const subtitleDe = String(row.subtitle_de || "");
  return {
    id: String(row.id),
    image: String(row.image || PLACEHOLDER_IMAGE),
    title: titleAr || titleDe,
    subtitle: subtitleAr || subtitleDe,
    titleAr,
    titleDe,
    subtitleAr,
    subtitleDe,
    linkUrl: row.link_url || null,
    linkCategoryId: row.link_category_id || null,
    sliderZone: mapSliderZone(row.slider_zone),
    sortOrder: row.sort_order ?? 0,
    active: row.active !== false,
    mediaType: mapMediaType(row.media_type),
    videoUrl: row.video_url || null,
    productId: row.product_id || null,
    interactiveStyle: row.interactive_style || null,
  };
}

function mapBrandLogo(row: BrandLogoRow): BrandLogo {
  return {
    id: String(row.id),
    name: String(row.name || ""),
    image: originalImageSrc(String(row.image || PLACEHOLDER_IMAGE)),
    linkUrl: row.link_url || null,
    sortOrder: row.sort_order ?? 0,
    active: row.active !== false,
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

  // Volle Spaltenauswahl; bei Schema-Drift (fehlende Spalten) Basis-Select.
  let { data, error } = await supabase
    .from("products_public")
    .select(PUBLIC_SELECT)
    .order("created_at", { ascending: false });

  if (error && /column|42703/i.test(error.message)) {
    const basic = await supabase
      .from("products_public")
      .select(PUBLIC_SELECT_BASIC)
      .order("created_at", { ascending: false });
    data = basic.data as typeof data;
    error = basic.error;
  }

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
  // show_on_homepage optional — Fallback ohne Spalte
  let data: CategoryRow[] | null = null;
  let error: { message: string } | null = null;

  const full = await supabase
    .from("categories")
    .select("id, name_ar, name_de, image, parent_id, sort_order, deleted_at, show_on_homepage")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if (full.error && /show_on_homepage|column/i.test(full.error.message)) {
    const basic = await supabase
      .from("categories")
      .select("id, name_ar, name_de, image, parent_id, sort_order, deleted_at")
      .is("deleted_at", null)
      .order("sort_order", { ascending: true });
    data = (basic.data as CategoryRow[] | null) ?? null;
    error = basic.error;
  } else {
    data = (full.data as CategoryRow[] | null) ?? null;
    error = full.error;
  }

  if (error || !data) {
    console.error("[catalog] categories:", error?.message);
    return [];
  }
  return nestCategories(
    data
      .map(mapCategory)
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
  const homepageSections = normalizeHomepageSections(v.homepageSections, {
    brands: v.brandsSectionTitle,
    banner2: v.banner2SectionTitle,
    banner3: v.banner3SectionTitle,
    categories: v.categoriesSectionTitle,
  });
  return {
    ...DEFAULT_SITE_CONFIG,
    ...v,
    name: v.name || DEFAULT_SITE_CONFIG.name,
    tagline: v.tagline || DEFAULT_SITE_CONFIG.tagline,
    brandsSectionTitle: v.brandsSectionTitle ?? DEFAULT_SITE_CONFIG.brandsSectionTitle,
    banner2SectionTitle: v.banner2SectionTitle ?? DEFAULT_SITE_CONFIG.banner2SectionTitle,
    banner3SectionTitle: v.banner3SectionTitle ?? DEFAULT_SITE_CONFIG.banner3SectionTitle,
    zoneLabels: {
      ...DEFAULT_SITE_CONFIG.zoneLabels,
      ...(v.zoneLabels ?? {}),
    },
    homepageSections,
  };
}

async function fetchHeroSlides(zone?: SliderZone): Promise<Slide[]> {
  const supabase = createPublicClient();
  const selectFull =
    "id, image, title, subtitle, title_ar, title_de, subtitle_ar, subtitle_de, link_url, link_category_id, slider_zone, sort_order, active, media_type, video_url, product_id, interactive_style";
  const selectMid =
    "id, image, title, subtitle, title_ar, title_de, subtitle_ar, subtitle_de, link_url, link_category_id, slider_zone, sort_order, active";
  const selectBasic = "id, image, title, subtitle, sort_order, active";

  let query = supabase
    .from("hero_slides")
    .select(selectFull)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (zone) {
    query = query.eq("slider_zone", zone);
  }

  let { data, error } = await query;

  if (error && /media_type|video_url|product_id|interactive_style/i.test(error.message)) {
    const mid = await supabase
      .from("hero_slides")
      .select(selectMid)
      .eq("active", true)
      .order("sort_order", { ascending: true });
    data = mid.data as typeof data;
    error = mid.error;
    if (!error && zone) {
      data = ((data as HeroSlideRow[] | null) ?? []).filter(
        (row) => mapSliderZone(row.slider_zone) === zone
      ) as typeof data;
    }
  }

  if (error && /column|slider_zone|link_url|title_ar/i.test(error.message)) {
    const basic = await supabase
      .from("hero_slides")
      .select(selectBasic)
      .eq("active", true)
      .order("sort_order", { ascending: true });
    data = basic.data as typeof data;
    error = basic.error;
    // Ohne Zone-Spalte: nur banner1 bekommt Defaults/Legacy-Daten
    if (!error && zone && zone !== "banner1") return [];
  }

  if (error || !data?.length) {
    if (error && !/relation|does not exist|42P01/i.test(error.message)) {
      console.error("[catalog] hero_slides:", error.message);
    }
    if (zone && zone !== "banner1") return [];
    return DEFAULT_HERO_SLIDES;
  }

  return (data as HeroSlideRow[]).map(mapHeroSlide);
}

async function fetchBrandLogos(): Promise<BrandLogo[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("brand_logos")
    .select("id, name, image, link_url, sort_order, active")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error || !data?.length) {
    if (error && !/relation|does not exist|42P01/i.test(error.message)) {
      console.error("[catalog] brand_logos:", error.message);
    }
    return [];
  }
  return (data as BrandLogoRow[]).map(mapBrandLogo);
}

const getCategoriesCached = unstable_cache(
  fetchAllCategories,
  ["catalog-categories-v4"],
  { revalidate: REVALIDATE_SECONDS, tags: ["catalog", "categories"] }
);

const getSiteConfigCached = unstable_cache(
  fetchSiteConfig,
  ["catalog-site-v3"],
  { revalidate: REVALIDATE_SECONDS, tags: ["catalog", "site"] }
);

const getSlidesCached = unstable_cache(
  () => fetchHeroSlides("banner1"),
  ["catalog-slides-banner1-v2"],
  { revalidate: REVALIDATE_SECONDS, tags: ["catalog", "slides"] }
);

const getBanner2Cached = unstable_cache(
  () => fetchHeroSlides("banner2"),
  ["catalog-slides-banner2-v1"],
  { revalidate: REVALIDATE_SECONDS, tags: ["catalog", "slides"] }
);

const getBanner3Cached = unstable_cache(
  () => fetchHeroSlides("banner3"),
  ["catalog-slides-banner3-v1"],
  { revalidate: REVALIDATE_SECONDS, tags: ["catalog", "slides"] }
);

const getAllSlidesCached = unstable_cache(
  () => fetchHeroSlides(),
  ["catalog-slides-all-v1"],
  { revalidate: REVALIDATE_SECONDS, tags: ["catalog", "slides"] }
);

const getBrandLogosCached = unstable_cache(
  fetchBrandLogos,
  ["catalog-brand-logos-v1"],
  { revalidate: REVALIDATE_SECONDS, tags: ["catalog", "slides", "brands"] }
);

/**
 * Produkte werden bewusst NICHT über unstable_cache zwischengespeichert, damit
 * frisch in die DB importierte Produkte sofort sichtbar sind. `cache` dedupt
 * lediglich innerhalb eines einzelnen Requests.
 */
export const getProductsAsync = cache(async (): Promise<Product[]> => {
  const products = await fetchAllPublicProducts();
  // Nie eine leere Seite: wenn die DB (noch) nichts liefert, Demo-Katalog zeigen.
  return products.length ? products : FALLBACK_PRODUCTS;
});

export const getCategoriesAsync = cache(async (): Promise<Category[]> => {
  const dbTree = await getCategoriesCached();
  const tree = dbTree.length ? dbTree : FALLBACK_CATEGORIES;
  const all: Category = {
    id: ALL_CATEGORY.id,
    name: ALL_CATEGORY.name,
    nameEn: ALL_CATEGORY.nameEn,
    image: ALL_CATEGORY.image,
    parentId: null,
    sortOrder: ALL_CATEGORY.sortOrder,
    showOnHomepage: true,
    children: [],
  };
  const sale: Category = {
    id: SALE_CATEGORY.id,
    name: SALE_CATEGORY.name,
    nameEn: SALE_CATEGORY.nameEn,
    image: SALE_CATEGORY.image,
    parentId: null,
    sortOrder: SALE_CATEGORY.sortOrder,
    showOnHomepage: true,
    children: [],
  };
  return [all, sale, ...tree];
});

/** Nur Hauptkategorien (Oberkategorien) auf der Startseite — keine Unterkategorien. */
export const getHomepageCategoriesAsync = cache(async (): Promise<Category[]> => {
  const tree = await getCategoriesCached();
  const source = tree.length ? tree : FALLBACK_CATEGORIES;
  return source
    .filter((c) => !c.parentId && c.showOnHomepage !== false)
    .map((c) => ({ ...c, children: [] }));
});

export const getSiteConfigAsync = cache(async (): Promise<SiteConfig> => {
  return getSiteConfigCached();
});

export const getHomepageSectionsAsync = cache(
  async (): Promise<HomepageSection[]> => {
    const site = await getSiteConfigCached();
    return (
      site.homepageSections ??
      normalizeHomepageSections(null, {
        brands: site.brandsSectionTitle,
        banner2: site.banner2SectionTitle,
        banner3: site.banner3SectionTitle,
        categories: site.categoriesSectionTitle,
      })
    );
  }
);

export const getSlidesAsync = cache(async (): Promise<Slide[]> => {
  return getSlidesCached();
});

export const getBanner1SlidesAsync = getSlidesAsync;

export const getBanner2SlidesAsync = cache(async (): Promise<Slide[]> => {
  return getBanner2Cached();
});

export const getBanner3SlidesAsync = cache(async (): Promise<Slide[]> => {
  return getBanner3Cached();
});

/** Alle aktiven Slides gruppiert nach freier Zone-ID */
export const getSlidesByZoneAsync = cache(
  async (): Promise<Record<string, Slide[]>> => {
    const all = await getAllSlidesCached();
    const byZone: Record<string, Slide[]> = {};
    for (const slide of all) {
      const zone = slide.sliderZone || "banner1";
      (byZone[zone] ??= []).push(slide);
    }
    if (!byZone.banner1?.length) {
      byZone.banner1 = DEFAULT_HERO_SLIDES;
    }
    return byZone;
  }
);

export const getBrandLogosAsync = cache(async (): Promise<BrandLogo[]> => {
  return getBrandLogosCached();
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
    const rawId = decodeURIComponent(String(id || "")).trim();

    if (isAllCategoryId(rawId)) {
      return {
        id: ALL_CATEGORY.id,
        name: ALL_CATEGORY.name,
        nameEn: ALL_CATEGORY.nameEn,
        image: ALL_CATEGORY.image,
        parentId: null,
        sortOrder: ALL_CATEGORY.sortOrder,
        children: [],
      };
    }

    if (isSaleCategoryId(rawId)) {
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
    const hit =
      all.find((c) => c.id === rawId) ||
      all.find(
        (c) =>
          c.id.toLowerCase() === rawId.toLowerCase() ||
          c.name === rawId ||
          c.nameEn === rawId
      );
    if (hit) return hit;

    // DB-Kategorie „Sale“/العروض (aus dem Baum ausgeblendet) → virtuelle Sale
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("categories")
      .select("id, name_ar, name_de, image, parent_id, sort_order")
      .eq("id", rawId)
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

    if (data) {
      return mapCategory(data as CategoryRow);
    }

    return undefined;
  }
);

export const getFeaturedProductsAsync = cache(async (): Promise<Product[]> => {
  const products = await getProductsAsync();
  const offers = products.filter(productIsOnSale);
  return offers.length ? offers : products.slice(0, 8);
});

/** Nur reduzierte Produkte (für die Angebote-Leiste). */
export const getOffersAsync = cache(async (): Promise<Product[]> => {
  const products = await getProductsAsync();
  return products.filter(productIsOnSale);
});

/**
 * Bestseller: Badge „bestseller“, sonst meistverkaufte / Featured-Fallback.
 */
export const getBestsellersAsync = cache(async (): Promise<Product[]> => {
  const products = await getProductsAsync();
  const tagged = products.filter((p) =>
    (p.badges ?? []).includes("bestseller")
  );
  if (tagged.length) return tagged;
  // Fallback: höchster Rabatt / neueste als „populär“
  const featured = products.filter((p) => p.featured);
  if (featured.length) return featured;
  return products.slice(0, 12);
});

/**
 * Reguläre / neueste Produkte (für die zweite Auto-Reihe).
 * Bevorzugt Produkte OHNE Rabatt; falls alle reduziert sind, die neuesten.
 */
export const getRegularProductsAsync = cache(async (): Promise<Product[]> => {
  const products = await getProductsAsync();
  const regular = products.filter((p) => !productIsOnSale(p));
  return regular.length ? regular : products;
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
    const rawId = decodeURIComponent(String(categoryId || "")).trim();

    // Sammelkategorie „Alle Produkte": ausnahmslos ALLE Produkte, kategorieübergreifend.
    if (isAllCategoryId(rawId)) {
      return products;
    }
    // products_public: nur deleted_at IS NULL & published

    const flat = await getFlatCategoriesAsync();
    const cat =
      flat.find((c) => c.id === rawId) ||
      flat.find(
        (c) =>
          c.id.toLowerCase() === rawId.toLowerCase() ||
          c.name === rawId ||
          c.nameEn === rawId
      );

    const resolvedId = cat?.id ?? rawId;

    let treatAsSale =
      isSaleCategoryId(resolvedId) || (cat != null && isSaleCategory(cat));

    // Gefilterte DB-Sale-Kategorie (UUID) erkennen
    if (!treatAsSale && !cat) {
      const supabase = createPublicClient();
      const { data } = await supabase
        .from("categories")
        .select("name_ar, name_de")
        .eq("id", rawId)
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

    const realFlat = flat.filter((c) => !isSaleCategory(c) && !isAllCategory(c));
    const ids = collectCategoryAndDescendantIds(resolvedId, realFlat);

    // Auch wenn die Kategorie nur als Unterknoten bekannt ist: Baum nachziehen
    if (ids.size <= 1) {
      const tree = await getCategoriesAsync();
      const walk = (nodes: Category[], capturing: boolean) => {
        for (const n of nodes) {
          if (isSaleCategory(n) || isAllCategory(n)) continue;
          const cap = capturing || n.id === resolvedId;
          if (cap) ids.add(n.id);
          if (n.children?.length) walk(n.children, cap);
        }
      };
      walk(tree, false);
    }

    // Direkte DB-Abfrage als zusätzlicher Fallback (falls Cache/Mapping hinkt)
    const matched = products.filter(
      (p) => p.categoryId && ids.has(p.categoryId)
    );
    if (matched.length > 0) return matched;

    // Letzter Versuch: exakter category_id Match (auch wenn Kategorie nicht im Baum)
    const direct = products.filter((p) => p.categoryId === resolvedId);
    if (direct.length > 0) return direct;

    // Live-Query gegen products_public / products
    try {
      const supabase = createPublicClient();
      const idList = [...ids];
      let query = supabase
        .from("products_public")
        .select(PUBLIC_SELECT_BASIC)
        .in("category_id", idList.length ? idList : [resolvedId]);
      let { data, error } = await query;
      if (error) {
        const retry = await supabase
          .from("products")
          .select(PUBLIC_SELECT_BASIC)
          .is("deleted_at", null)
          .in("category_id", idList.length ? idList : [resolvedId]);
        data = retry.data as typeof data;
        error = retry.error;
      }
      if (!error && data?.length) {
        return (data as PublicRow[]).map(mapPublicProduct);
      }
    } catch (e) {
      console.error("[catalog] getProductsByCategoryAsync live query:", e);
    }

    return matched;
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
