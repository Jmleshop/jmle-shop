import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  filterProductsForBrand,
  hasBrandLogo,
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

describe("hasBrandLogo", () => {
  it("treats empty values and the placeholder as missing", () => {
    assert.equal(hasBrandLogo(""), false);
    assert.equal(hasBrandLogo(null), false);
    assert.equal(hasBrandLogo("/placeholder.svg"), false);
    assert.equal(hasBrandLogo("https://x.supabase.co/storage/v1/object/public/product-images/brands/a.webp"), true);
  });
});
