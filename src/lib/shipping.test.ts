import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estimateShippingByWeight,
  productShippingGrams,
  toGrams,
} from "./shipping";

describe("weight shipping", () => {
  it("converts kilograms and keeps grams", () => {
    assert.equal(toGrams(1.5, "kg"), 1500);
    assert.equal(toGrams(250, "g"), 250);
  });

  it("prefers gross shipping weight over fill weight", () => {
    assert.equal(
      productShippingGrams({
        grossWeightValue: 400,
        grossWeightUnit: "g",
        weightValue: 1,
        weightUnit: "kg",
      }),
      400
    );
  });

  it("charges another euro step per extra kilogram and drops to zero at the free threshold", () => {
    assert.equal(estimateShippingByWeight(20, 800), 4.9);
    assert.equal(estimateShippingByWeight(20, 1500), 6.3);
    assert.equal(estimateShippingByWeight(49, 5000), 0);
  });
});
