import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isDuplicateBrandName, normalizeBrandName } from "./brand-name";

describe("brand-name", () => {
  it("normalizes whitespace and case", () => {
    assert.equal(normalizeBrandName("  Durra  "), "durra");
    assert.equal(normalizeBrandName("Chtoura   Garden"), "chtoura garden");
  });

  it("detects duplicates case-insensitively", () => {
    const rows = [
      { id: "a", name: "Durra" },
      { id: "b", name: "Chtoura Garden" },
    ];
    assert.equal(isDuplicateBrandName("durra", rows), true);
    assert.equal(isDuplicateBrandName("DURRA", rows), true);
    assert.equal(isDuplicateBrandName("durra", rows, "a"), false);
    assert.equal(isDuplicateBrandName("Neue Marke", rows), false);
  });
});
