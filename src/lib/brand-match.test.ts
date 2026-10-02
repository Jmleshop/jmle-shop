import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BRAND_CATALOG } from "./brand-catalog";
import {
  buildAliasIndex,
  matchProductToBrand,
  normalizeMatchText,
  textContainsAlias,
} from "./brand-match";

describe("brand-match", () => {
  it("normalizes alef variants", () => {
    assert.equal(normalizeMatchText("أحمد"), normalizeMatchText("احمد"));
  });

  it("matches Durra aliases", () => {
    assert.equal(textContainsAlias("Durra Gewürzmischung", "Durra"), true);
    assert.equal(textContainsAlias("بهارات الدرة الأصلية", "الدرة"), true);
    assert.equal(textContainsAlias("منتج درة فاخر", "درة"), true);
  });

  it("does not match Amarin inside Tamarindensaft", () => {
    assert.equal(textContainsAlias("Tamarindensaft", "Amarin"), false);
    assert.equal(textContainsAlias("Amarin Juice", "Amarin"), true);
  });

  it("matches Chtoura / شتورة", () => {
    assert.equal(
      textContainsAlias("Chtoura Garden Hummus", "Chtoura Garden"),
      true
    );
    assert.equal(textContainsAlias("لبنة شتورة", "شتورة"), true);
  });

  it("does not false-positive short هنا inside longer words context loosely", () => {
    // „هنا“ allein als Wort
    assert.equal(textContainsAlias("منتج هنا الأصلي", "هنا"), true);
    assert.equal(textContainsAlias("منتجات متنوعة", "هنا"), false);
  });

  it("catalog has expected size and unique ids", () => {
    assert.ok(BRAND_CATALOG.length >= 70);
    const ids = new Set(BRAND_CATALOG.map((b) => b.id));
    assert.equal(ids.size, BRAND_CATALOG.length);
  });

  it("matchProductToBrand picks longest alias brand", () => {
    const index = buildAliasIndex(BRAND_CATALOG);
    const brandId = matchProductToBrand(
      {
        id: "1",
        name_ar: "حمص حدائق شتورة",
        name_de: "Chtoura Garden Hummus",
      },
      index
    );
    assert.equal(brandId, "brand-chtoura-garden");
  });
});
