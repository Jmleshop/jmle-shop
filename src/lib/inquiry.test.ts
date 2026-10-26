import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeInquiryLines, summarizeLines } from "./inquiry";

describe("sanitizeInquiryLines", () => {
  it("returns null for non-arrays", () => {
    assert.equal(sanitizeInquiryLines(undefined), null);
    assert.equal(sanitizeInquiryLines({}), null);
  });

  it("drops invalid lines and clamps values", () => {
    const lines = sanitizeInquiryLines([
      { productId: "p1", name: "رز", quantity: 2.7, unitPrice: 1.005, vatRate: 7 },
      { productId: "p2", name: "x", quantity: -1, unitPrice: 2, vatRate: 19 },
      { productId: "p3", name: "", quantity: 1, unitPrice: 2, vatRate: 19 },
      { productId: "p4", name: "y", quantity: 50000, unitPrice: 3, vatRate: 12 },
      "junk",
    ]);
    assert.deepEqual(lines, [
      { productId: "p1", name: "رز", quantity: 2, unitPrice: 1, vatRate: 7 },
      { productId: "p4", name: "y", quantity: 9999, unitPrice: 3, vatRate: 19 },
    ]);
  });

  it("feeds summarizeLines with clean numbers", () => {
    const lines = sanitizeInquiryLines([{ productId: "a", name: "a", quantity: "3", unitPrice: "2.5", vatRate: 19 }]);
    assert.equal(summarizeLines(lines ?? []).total, 7.5);
  });
});
