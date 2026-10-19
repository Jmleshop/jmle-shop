import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  catalogFiltersToSearchParams,
  catalogHasActiveFilters,
  escapeIlikeTerm,
  filterProducts,
  paginateProducts,
  parseCatalogFilters,
  sortByArabicName,
  sortProducts,
  type CatalogFilterState,
} from "@/lib/catalog-filters";
import type { Product } from "@/types";

function product(partial: Partial<Product> & { id: string; name: string }): Product {
  return {
    nameDe: "",
    description: "",
    price: 0,
    discountPercent: 0,
    vatRate: 7,
    categoryId: "",
    brandId: null,
    image: "/placeholder.svg",
    images: [],
    stock: 1,
    inStock: true,
    maxOrderQuantity: null,
    ...partial,
  };
}

describe("catalog-filters", () => {
  it("parses and normalizes URL params", () => {
    const state = parseCatalogFilters({
      q: "  بهارات  ",
      category: "cat-1",
      brand: "brand-x",
      min: "3,5",
      max: "1",
      sort: "price-desc",
      page: "2",
    });
    assert.equal(state.q, "بهارات");
    assert.equal(state.categoryId, "cat-1");
    assert.equal(state.brandId, "brand-x");
    assert.equal(state.minPrice, 1);
    assert.equal(state.maxPrice, 3.5);
    assert.equal(state.sort, "price-desc");
    assert.equal(state.page, 2);
  });

  it("builds shareable search params omitting defaults", () => {
    const state: CatalogFilterState = {
      q: "reis",
      categoryId: "",
      brandId: "b1",
      minPrice: null,
      maxPrice: 10,
      sort: "name-ar",
      page: 1,
      pageSize: 30,
    };
    const sp = catalogFiltersToSearchParams(state);
    assert.equal(sp.get("q"), "reis");
    assert.equal(sp.get("brand"), "b1");
    assert.equal(sp.get("max"), "10");
    assert.equal(sp.get("sort"), null);
    assert.equal(sp.get("page"), null);
  });

  it("detects active filters", () => {
    const base = parseCatalogFilters({});
    assert.equal(catalogHasActiveFilters(base), false);
    assert.equal(
      catalogHasActiveFilters({ ...base, brandId: "x" }, { ignoreBrand: true }),
      false
    );
    assert.equal(catalogHasActiveFilters({ ...base, minPrice: 1 }), true);
  });

  it("filters by brand, category, price and Arabic query", () => {
    const items = [
      product({
        id: "1",
        name: "بهارات مشكلة",
        nameDe: "Gewürzmischung",
        price: 4.5,
        categoryId: "c1",
        brandId: "b1",
      }),
      product({
        id: "2",
        name: "أرز بسمتي",
        nameDe: "Basmati Reis",
        price: 8,
        categoryId: "c2",
        brandId: "b2",
      }),
      product({
        id: "3",
        name: "زيت زيتون",
        nameDe: "Olivenöl",
        price: 12,
        categoryId: "c1",
        brandId: "b1",
      }),
    ];
    const filtered = filterProducts(
      items,
      parseCatalogFilters({
        q: "بهار",
        category: "c1",
        brand: "b1",
        min: "1",
        max: "10",
      })
    );
    assert.deepEqual(
      filtered.map((p) => p.id),
      ["1"]
    );
  });

  it("sorts by price and Arabic name", () => {
    const items = [
      product({ id: "a", name: "ياسمين", nameDe: "Jasmin", price: 9 }),
      product({ id: "b", name: "أرز", nameDe: "Reis", price: 3 }),
      product({ id: "c", name: "بهارات", nameDe: "Gewürze", price: 5 }),
    ];
    assert.deepEqual(
      sortProducts(items, "price-asc").map((p) => p.id),
      ["b", "c", "a"]
    );
    assert.deepEqual(
      sortProducts(items, "price-desc").map((p) => p.id),
      ["a", "c", "b"]
    );
    const arSorted = [...items].sort((x, y) => sortByArabicName(x, y));
    assert.equal(arSorted[0].name.localeCompare(arSorted[1].name, "ar") <= 0, true);
  });

  it("paginates results", () => {
    const items = Array.from({ length: 35 }, (_, i) => i);
    const page1 = paginateProducts(items, 1, 30);
    assert.equal(page1.items.length, 30);
    assert.equal(page1.total, 35);
    assert.equal(page1.pageCount, 2);
    const page2 = paginateProducts(items, 2, 30);
    assert.equal(page2.items.length, 5);
  });

  it("escapes ilike terms", () => {
    assert.equal(escapeIlikeTerm("a%b_c,(x)"), "abcx");
  });
});
