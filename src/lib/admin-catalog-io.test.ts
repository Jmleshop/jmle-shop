import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseCsv,
  previewCsvEdits,
  productsToCsv,
  suggestedBrandForProduct,
} from "./admin-catalog-io";
import type { FoodProduct } from "../types";

const brands = [
  { id: "durra", name: "Durra" },
  { id: "baladna", name: "Baladna" },
];

function product(partial: Partial<FoodProduct> & { id: string }): FoodProduct {
  return {
    name_ar: "منتج",
    name_de: "Produkt",
    description: "",
    price: 1.5,
    currency: "EUR",
    category_id: "cat-1",
    brand_id: null,
    image: null,
    images: [],
    ingredients: "",
    allergens: "",
    origin_country: "",
    weight_value: null,
    weight_unit: "g",
    vat_rate: 7,
    stock_quantity: 10,
    barcode: null,
    product_number: "P-1",
    ...partial,
  } as FoodProduct;
}

describe("productsToCsv brand columns", () => {
  it("exports brand_id, brand_name, and suggested_brand", () => {
    const rows = [
      product({
        id: "p1",
        brand_id: "durra",
        name_ar: "دورة زيت",
        name_de: "Durra Öl",
      }),
      product({ id: "p2", brand_id: null, name_ar: "منتج بلا علامة" }),
    ];
    const csv = productsToCsv(rows, brands);
    const parsed = parseCsv(csv);
    assert.match(csv.split("\n")[0]!, /brand_id,brand_name,suggested_brand/);
    assert.equal(parsed[0]?.brand_id, "durra");
    assert.equal(parsed[0]?.brand_name, "Durra");
    assert.equal(parsed[1]?.brand_id, "");
    assert.equal(parsed[1]?.brand_name, "");
  });
});

describe("previewCsvEdits brand updates", () => {
  it("maps brand_name to existing brand_id", () => {
    const products = [product({ id: "p1", brand_id: null })];
    const rows = parseCsv("id,brand_name\np1,Durra\n");
    const preview = previewCsvEdits(products, rows, brands);
    assert.deepEqual(preview.issues, []);
    assert.equal(preview.updates[0]?.fields.brand_id, "durra");
  });

  it("queues createBrandName when brand is unknown", () => {
    const products = [product({ id: "p1", brand_id: null })];
    const rows = parseCsv("id,brand_name\np1,Neue Marke XYZ\n");
    const preview = previewCsvEdits(products, rows, brands);
    assert.deepEqual(preview.issues, []);
    assert.equal(preview.updates[0]?.createBrandName, "Neue Marke XYZ");
  });

  it("rejects unknown brand_id", () => {
    const products = [product({ id: "p1", brand_id: null })];
    const rows = parseCsv("id,brand_id\np1,unknown-brand\n");
    const preview = previewCsvEdits(products, rows, brands);
    assert.ok(
      preview.issues.some((i) => /unbekannte brand_id/.test(i.message))
    );
  });
});

describe("suggestedBrandForProduct", () => {
  it("returns a string suggestion", () => {
    const p = product({
      id: "x",
      name_ar: "منتج عشوائي بدون علامة معروفة",
      name_de: "Random product without known brand",
      description: "",
      ingredients: "",
    });
    assert.equal(typeof suggestedBrandForProduct(p, brands), "string");
  });
});
