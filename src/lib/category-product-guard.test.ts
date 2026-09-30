import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { uncategorizedLabel } from "./category-product-guard";

describe("category-product-guard", () => {
  it("returns bilingual uncategorized labels", () => {
    assert.equal(uncategorizedLabel("de"), "ohne Kategorie");
    assert.equal(uncategorizedLabel("ar"), "بدون فئة");
  });
});
