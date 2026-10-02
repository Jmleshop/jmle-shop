import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultLayoutDocument,
  documentsEqual,
  normalizeLayoutDocument,
  normalizeLayoutVersions,
} from "./layout-builder";

describe("layout-builder", () => {
  it("normalizes partial documents with defaults", () => {
    const doc = normalizeLayoutDocument({
      chrome: { logoScale: 1.5, cartPosition: "start" },
    });
    assert.equal(doc.version, 1);
    assert.equal(doc.chrome.logoScale, 1.5);
    assert.equal(doc.chrome.cartPosition, "start");
    assert.equal(doc.slider.mobile.objectFit, "contain");
  });

  it("clamps logo scale", () => {
    assert.equal(
      normalizeLayoutDocument({ chrome: { logoScale: 99 } }).chrome.logoScale,
      2.5
    );
    assert.equal(
      normalizeLayoutDocument({ chrome: { logoScale: 0.1 } }).chrome.logoScale,
      0.5
    );
  });

  it("compares documents ignoring updatedAt", () => {
    const a = defaultLayoutDocument();
    const b = {
      ...defaultLayoutDocument(),
      updatedAt: "2099-01-01T00:00:00.000Z",
    };
    assert.equal(documentsEqual(a, b), true);
  });

  it("normalizes version list", () => {
    const versions = normalizeLayoutVersions([
      { id: "v1", label: "A", publishedAt: "2026-01-01", document: {} },
      { foo: 1 },
    ]);
    assert.equal(versions.length, 1);
    assert.equal(versions[0].id, "v1");
  });
});
