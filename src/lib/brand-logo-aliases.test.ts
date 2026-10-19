import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  aliasesForBrand,
  filterProductsForBrand,
  findBrandSeed,
  productMatchesBrand,
} from "@/lib/brand-link";

function p(name: string, nameDe = "") {
  return {
    id: name,
    name,
    nameDe,
    description: "",
    ingredients: "",
    brandId: null as string | null,
  };
}

describe("brand logo aliases for production names", () => {
  const cases: Array<{
    logo: string;
    product: string;
    expectSeed?: string;
  }> = [
    { logo: "DURRA", product: "الدرة برغل أسمر ناعم 900 غرام", expectSeed: "brand-aldurra" },
    { logo: "Chamise", product: "شمسين برغل أصفر خشن 800 غرام", expectSeed: "brand-shamsin" },
    { logo: "hamol", product: "هامول كريم أطفال 45 غرام", expectSeed: "brand-hamoul" },
    { logo: "Al Raii", product: "الراعي لبنة كرات 425 غرام", expectSeed: "brand-al-rai" },
    { logo: "Ahmad Tea", product: "شاي احمد 500 غرام", expectSeed: "brand-ahmad" },
    {
      logo: "Do Ghazal Tea",
      product: "شاي دو غزال 500 غرام",
      expectSeed: "brand-do-ghazal",
    },
    { logo: "Kasih", product: "الكسيح حمص بالطحينة", expectSeed: "brand-al-kaseeh" },
    {
      logo: "Hamwi Cafe",
      product: "بن الحموي قهوة كلاسيك مع هال 450 غرام",
      expectSeed: "brand-bin-al-hamwi",
    },
    {
      logo: "AlShami Cafe",
      product: "بن الشامي قهوة بالهال إكسترا",
      expectSeed: "brand-bin-al-shami",
    },
    {
      logo: "Cheery brand",
      product: "شاي إيرل جري كرزة 25 ظرف",
      expectSeed: "brand-keraza",
    },
    { logo: "Abido", product: "عبيدو بهارات مشكلة" },
  ];

  for (const c of cases) {
    it(`matches products for logo "${c.logo}"`, () => {
      if (c.expectSeed) {
        const seed = findBrandSeed("custom-id", c.logo);
        assert.ok(seed, `seed for ${c.logo}`);
        assert.equal(seed!.id, c.expectSeed);
      }
      const product = p(c.product);
      assert.equal(
        productMatchesBrand(product, "custom-id", c.logo),
        true,
        `${c.logo} should match ${c.product}`
      );
      const filtered = filterProductsForBrand(
        [product, p("منتج عشوائي بدون علامة")],
        "custom-id",
        c.logo
      );
      assert.equal(filtered.length, 1);
      assert.ok(aliasesForBrand("custom-id", c.logo).length >= 2);
    });
  }
});
