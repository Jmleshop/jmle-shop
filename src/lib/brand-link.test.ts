import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  filterProductsForBrand,
  productMatchesBrand,
  resolveProductBrandId,
} from "@/lib/brand-link";

describe("brand-link", () => {
  it("matches الدرة products by name when brand_id is missing", () => {
    const product = {
      id: "1",
      name: "الدرة برغل أسمر ناعم 900 غرام",
      nameDe: "Al Durra Bulgur",
      description: "",
      ingredients: "",
      brandId: null as string | null,
    };
    assert.equal(productMatchesBrand(product, "brand-aldurra", "الدرة"), true);
    assert.equal(resolveProductBrandId(product), "brand-aldurra");
  });

  it("keeps explicit brandId", () => {
    const product = {
      id: "2",
      name: "Something else",
      description: "",
      brandId: "brand-shamsin",
    };
    assert.equal(resolveProductBrandId(product), "brand-shamsin");
    assert.equal(productMatchesBrand(product, "brand-shamsin"), true);
  });

  it("filters a mixed list to one brand", () => {
    const list = [
      {
        id: "a",
        name: "شمسين حلاوة",
        description: "",
        brandId: null as string | null,
      },
      {
        id: "b",
        name: "الدرة سميد",
        description: "",
        brandId: null as string | null,
      },
      {
        id: "c",
        name: "أرز بسمتي",
        description: "",
        brandId: null as string | null,
      },
    ];
    const shamsin = filterProductsForBrand(list, "brand-shamsin", "شمسين");
    assert.deepEqual(
      shamsin.map((p) => p.id),
      ["a"]
    );
  });
});
