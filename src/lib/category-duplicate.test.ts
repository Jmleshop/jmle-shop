import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findDuplicateCategory, normalizeCategoryName } from "./category-duplicate";

const rows = [
  { id: "a", name_ar: "قسم المونة", parent_id: null, deleted_at: null },
  { id: "b", name_ar: "فحم", parent_id: "kategorie-56", deleted_at: null },
  { id: "c", name_ar: "لوازم منزلية", parent_id: null, deleted_at: "2026-09-23T20:29:40Z" },
];

describe("category-duplicate", () => {
  it("normalizes whitespace and case", () => {
    assert.equal(normalizeCategoryName("  Obst   und Gemüse "), "obst und gemüse");
  });

  it("finds an active duplicate under the same parent", () => {
    assert.equal(findDuplicateCategory(rows, { name_ar: " قسم  المونة" })?.id, "a");
    assert.equal(findDuplicateCategory(rows, { name_ar: "فحم", parent_id: "kategorie-56" })?.id, "b");
  });

  it("allows the same name under a different parent", () => {
    assert.equal(findDuplicateCategory(rows, { name_ar: "فحم", parent_id: null }), null);
    assert.equal(findDuplicateCategory(rows, { name_ar: "قسم المونة", parent_id: "x" }), null);
  });

  it("ignores trashed rows and the row being edited", () => {
    assert.equal(findDuplicateCategory(rows, { name_ar: "لوازم منزلية" }), null);
    assert.equal(findDuplicateCategory(rows, { name_ar: "قسم المونة" }, "a"), null);
  });
});
