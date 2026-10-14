import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_HOMEPAGE_SECTIONS,
  dedupeBrandsSections,
  normalizeHomepageSections,
} from "@/lib/homepage-sections";

describe("homepage-sections brands dedupe", () => {
  it("default config has exactly one brands section", () => {
    const brands = DEFAULT_HOMEPAGE_SECTIONS.filter((s) => s.type === "brands");
    assert.equal(brands.length, 1);
    assert.equal(brands[0]?.id, "sec-brands");
  });

  it("dedupeBrandsSections keeps the first brands entry only", () => {
    const out = dedupeBrandsSections([
      { id: "a", type: "slider", title: "", sortOrder: 0, active: true, zone: "banner1" },
      { id: "b1", type: "brands", title: "One", sortOrder: 1, active: true },
      { id: "c", type: "categories", title: "", sortOrder: 2, active: true },
      { id: "b2", type: "brands", title: "Two", sortOrder: 3, active: true },
    ]);
    assert.equal(out.filter((s) => s.type === "brands").length, 1);
    assert.equal(out.find((s) => s.type === "brands")?.id, "b1");
    assert.equal(out.length, 3);
  });

  it("normalizeHomepageSections strips duplicate brands from stored config", () => {
    const out = normalizeHomepageSections([
      { id: "sec-banner1", type: "slider", zone: "banner1", sortOrder: 0 },
      { id: "sec-brands", type: "brands", title: "Marken", sortOrder: 1 },
      { id: "sec-banner2", type: "slider", zone: "banner2", sortOrder: 2 },
      { id: "sec-brands-2", type: "brands", title: "Nochmal", sortOrder: 5 },
    ]);
    assert.equal(out.filter((s) => s.type === "brands").length, 1);
    assert.equal(out.find((s) => s.type === "brands")?.id, "sec-brands");
  });
});
