import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldAutoCenterFolder } from "./center-image-square";

describe("shouldAutoCenterFolder", () => {
  it("centers product and category folders", () => {
    assert.equal(shouldAutoCenterFolder("products"), true);
    assert.equal(shouldAutoCenterFolder("categories"), true);
    assert.equal(shouldAutoCenterFolder("Products"), true);
  });

  it("skips banners / slides / hero (no auto frame or cutout path)", () => {
    assert.equal(shouldAutoCenterFolder("banners"), false);
    assert.equal(shouldAutoCenterFolder("banner"), false);
    assert.equal(shouldAutoCenterFolder("slides"), false);
    assert.equal(shouldAutoCenterFolder("hero"), false);
  });
});
