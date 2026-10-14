import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  arabicSortKey,
  compareAlpha,
  missingArabicName,
  sortByArabicName,
} from "@/lib/locale-sort";

describe("locale-sort arabic", () => {
  it("sortByArabicName orders by Arabic alphabet", () => {
    const items = [
      { id: "3", name: "تمر" },
      { id: "1", name: "أرز" },
      { id: "2", name: "زيت" },
    ];
    const sorted = sortByArabicName(items);
    assert.deepEqual(
      sorted.map((i) => i.id),
      ["1", "3", "2"]
    );
  });

  it("prefers name_ar over German fallback", () => {
    const items = [
      { id: "b", name_ar: "ب", nameDe: "Zebra" },
      { id: "a", name_ar: "ا", nameDe: "Apfel" },
    ];
    const sorted = sortByArabicName(items);
    assert.equal(sorted[0]?.id, "a");
    assert.equal(arabicSortKey(items[0]!), "ب");
  });

  it("puts missing name_ar at the end and flags them", () => {
    const items = [
      { id: "de", name_de: "Apfel", name_ar: "" },
      { id: "ar", name_ar: "أرز" },
    ];
    assert.equal(missingArabicName(items[0]!), true);
    assert.equal(missingArabicName(items[1]!), false);
    const sorted = sortByArabicName(items);
    assert.deepEqual(
      sorted.map((i) => i.id),
      ["ar", "de"]
    );
  });

  it("compareAlpha uses localeCompare ar", () => {
    const cmp = compareAlpha("أرز", "تمر", "ar", "az");
    assert.ok(cmp < 0);
  });
});
