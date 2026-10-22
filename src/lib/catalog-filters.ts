import { compareAlpha, type SortUiLang } from "@/lib/locale-sort";
import { productTitle, type ShopLang } from "@/lib/shop-i18n";
import { normalizeArabicSearch } from "@/lib/search";
import type { Product } from "@/types";

/** Shop/brand/category catalog page size — keeps HTML + image fan-out small. */
export const CATALOG_PAGE_SIZE = 24;
export const CATALOG_PAGE_SIZE_MAX = 24;

export type CatalogSort =
  | "price-asc"
  | "price-desc"
  | "name-az"
  | "name-ar";

export type CatalogFilterState = {
  q: string;
  categoryId: string;
  brandId: string;
  minPrice: number | null;
  maxPrice: number | null;
  sort: CatalogSort;
  page: number;
  pageSize: number;
};

export type CatalogFilterParams = {
  q?: string | string[] | undefined;
  category?: string | string[] | undefined;
  brand?: string | string[] | undefined;
  min?: string | string[] | undefined;
  max?: string | string[] | undefined;
  sort?: string | string[] | undefined;
  page?: string | string[] | undefined;
  pageSize?: string | string[] | undefined;
};

const SORT_SET = new Set<CatalogSort>([
  "price-asc",
  "price-desc",
  "name-az",
  "name-ar",
]);

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return String(value[0] ?? "").trim();
  return String(value ?? "").trim();
}

function parseNonNegNumber(raw: string): number | null {
  if (!raw) return null;
  const n = Number(raw.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** Parse shareable URL/search params into a normalized filter state. */
export function parseCatalogFilters(
  params: CatalogFilterParams,
  defaults?: Partial<CatalogFilterState>
): CatalogFilterState {
  const pageSize = Math.min(
    CATALOG_PAGE_SIZE_MAX,
    Math.max(
      1,
      parseInt(firstParam(params.pageSize), 10) ||
        defaults?.pageSize ||
        CATALOG_PAGE_SIZE
    )
  );
  const page = Math.max(
    1,
    parseInt(firstParam(params.page), 10) || defaults?.page || 1
  );
  const sortRaw = firstParam(params.sort) as CatalogSort;
  const sort = SORT_SET.has(sortRaw)
    ? sortRaw
    : defaults?.sort || "name-ar";

  let minPrice = parseNonNegNumber(firstParam(params.min));
  let maxPrice = parseNonNegNumber(firstParam(params.max));
  if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
    const swap = minPrice;
    minPrice = maxPrice;
    maxPrice = swap;
  }

  return {
    q: firstParam(params.q).slice(0, 80),
    categoryId: firstParam(params.category).slice(0, 120),
    brandId: firstParam(params.brand).slice(0, 120),
    minPrice,
    maxPrice,
    sort,
    page,
    pageSize,
  };
}

/** Build URLSearchParams from filter state (omits defaults/empty). */
export function catalogFiltersToSearchParams(
  state: CatalogFilterState,
  opts?: { omitBrand?: boolean; omitPage?: boolean }
): URLSearchParams {
  const sp = new URLSearchParams();
  if (state.q) sp.set("q", state.q);
  if (state.categoryId) sp.set("category", state.categoryId);
  if (state.brandId && !opts?.omitBrand) sp.set("brand", state.brandId);
  if (state.minPrice != null) sp.set("min", String(state.minPrice));
  if (state.maxPrice != null) sp.set("max", String(state.maxPrice));
  if (state.sort && state.sort !== "name-ar") sp.set("sort", state.sort);
  if (!opts?.omitPage && state.page > 1) sp.set("page", String(state.page));
  return sp;
}

export function catalogHasActiveFilters(
  state: CatalogFilterState,
  opts?: { ignoreBrand?: boolean }
): boolean {
  return Boolean(
    state.q ||
      state.categoryId ||
      (!opts?.ignoreBrand && state.brandId) ||
      state.minPrice != null ||
      state.maxPrice != null ||
      (state.sort && state.sort !== "name-ar")
  );
}

/** Arabic-aware product name sort (localeCompare('ar') via compareAlpha). */
export function sortByArabicName(
  a: Product,
  b: Product,
  direction: "az" | "za" = "az"
): number {
  const titleA = `${a.name || ""} ${a.nameDe || ""}`.trim();
  const titleB = `${b.name || ""} ${b.nameDe || ""}`.trim();
  return compareAlpha(titleA, titleB, "ar", direction);
}

export function effectiveProductPrice(p: Product): number {
  const n = Number(p.price);
  return Number.isFinite(n) ? n : 0;
}

export function productMatchesQuery(p: Product, q: string): boolean {
  const needle = normalizeArabicSearch(q);
  if (!needle) return true;
  const hay = normalizeArabicSearch(
    `${p.name} ${p.nameDe ?? ""} ${p.description} ${p.ingredients ?? ""} ${p.originCountry ?? ""}`
  );
  return hay.includes(needle);
}

export function filterProducts(
  products: Product[],
  state: CatalogFilterState,
  opts?: { categoryIds?: Set<string> | null; lockedBrandId?: string }
): Product[] {
  const brandId = opts?.lockedBrandId || state.brandId;
  const categoryIds = opts?.categoryIds;

  return products.filter((p) => {
    if (brandId && p.brandId !== brandId) return false;
    if (categoryIds && categoryIds.size > 0) {
      if (!p.categoryId || !categoryIds.has(p.categoryId)) return false;
    } else if (state.categoryId && p.categoryId !== state.categoryId) {
      return false;
    }
    const price = effectiveProductPrice(p);
    if (state.minPrice != null && price < state.minPrice) return false;
    if (state.maxPrice != null && price > state.maxPrice) return false;
    if (state.q && !productMatchesQuery(p, state.q)) return false;
    return true;
  });
}

export function sortProducts(
  products: Product[],
  sort: CatalogSort,
  lang: ShopLang | SortUiLang = "ar"
): Product[] {
  const list = [...products];
  switch (sort) {
    case "price-asc":
      return list.sort(
        (a, b) => effectiveProductPrice(a) - effectiveProductPrice(b)
      );
    case "price-desc":
      return list.sort(
        (a, b) => effectiveProductPrice(b) - effectiveProductPrice(a)
      );
    case "name-az": {
      const ui = lang === "de" ? "de" : "ar";
      return list.sort((a, b) =>
        compareAlpha(productTitle(ui, a), productTitle(ui, b), ui, "az")
      );
    }
    case "name-ar":
    default:
      return list.sort((a, b) => sortByArabicName(a, b, "az"));
  }
}

export function paginateProducts<T>(
  items: T[],
  page: number,
  pageSize: number
): { items: T[]; total: number; page: number; pageCount: number } {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageCount,
  };
}

/** Escape user text for PostgREST `.or()` / ilike fragments. */
export function escapeIlikeTerm(raw: string): string {
  return raw
    .replace(/\\/g, "")
    .replace(/%/g, "")
    .replace(/_/g, "")
    .replace(/,/g, "")
    .replace(/\(/g, "")
    .replace(/\)/g, "")
    .trim();
}
