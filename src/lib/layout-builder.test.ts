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

  it("emits banner height/aspect and logo scale CSS vars", async () => {
    const { layoutCssVars } = await import("./layout-builder");
    const doc = defaultLayoutDocument();
    doc.chrome.logoScale = 1.95;
    doc.slider.desktop.heightPx = 320;
    doc.slider.desktop.marginY = -8;
    doc.slider.desktop.objectFit = "cover";
    const vars = layoutCssVars(doc, "desktop");
    assert.equal(vars["--layout-logo-scale"], "1.95");
    assert.equal(vars["--layout-banner-height"], "320px");
    assert.equal(vars["--layout-banner-aspect"], "auto");
    assert.equal(vars["--layout-banner-margin-y"], "-8px");
    assert.equal(vars["--layout-banner-object-fit"], "cover");

    const auto = layoutCssVars(defaultLayoutDocument(), "desktop");
    assert.equal(auto["--layout-banner-height"], "auto");
    assert.equal(auto["--layout-banner-aspect"], "2.4 / 1");
  });
});
