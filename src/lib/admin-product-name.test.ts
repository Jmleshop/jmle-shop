import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { adminProductName } from "./admin-product-name";

describe("adminProductName", () => {
  it("uses the Arabic name when the German one is empty", () => {
    assert.deepEqual(adminProductName({ id: "p1", name_ar: "رز", name_de: "" }), { primary: "رز", secondary: "" });
    assert.deepEqual(adminProductName({ id: "p1", name_ar: "رز", name_de: null }), { primary: "رز", secondary: "" });
  });

  it("shows German as secondary when both exist", () => {
    assert.deepEqual(adminProductName({ name_ar: "رز", name_de: "Reis" }), { primary: "رز", secondary: "Reis" });
  });

  it("falls back to German, then the id", () => {
    assert.equal(adminProductName({ name_ar: " ", name_de: "Reis" }).primary, "Reis");
    assert.equal(adminProductName({ id: "p9" }).primary, "p9");
  });
});
