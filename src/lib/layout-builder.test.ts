import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultLayoutDocument,
  documentsEqual,
  layoutCssVars,
  normalizeBuilderContentDraft,
  normalizeLayoutDocument,
  normalizeLayoutVersions,
} from "./layout-builder";

describe("layout-builder", () => {
  it("normalizes partial documents with defaults (v2)", () => {
    const doc = normalizeLayoutDocument({
      chrome: { logoScale: 1.5, cartPosition: "start" },
    });
    assert.equal(doc.version, 2);
    assert.equal(doc.chrome.logoScale, 1.5);
    assert.equal(doc.chrome.cartPosition, "start");
    assert.equal(doc.slider.mobile.objectFit, "contain");
    assert.equal(doc.header.scale, 1);
    assert.equal(doc.brands.logoScale, 1);
    assert.equal(doc.typography.sectionTitleAlign, "center");
  });

  it("migrates v1 payloads to v2", () => {
    const doc = normalizeLayoutDocument({
      version: 1,
      chrome: { logoScale: 1.2 },
      slider: { desktop: { heightPx: 200 } },
    });
    assert.equal(doc.version, 2);
    assert.equal(doc.slider.desktop.heightPx, 200);
    assert.ok(doc.header);
    assert.ok(doc.brands);
    assert.ok(doc.typography);
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
    assert.equal(versions[0].document.version, 2);
  });

  it("emits banner, header, brands and typography CSS vars", () => {
    const doc = defaultLayoutDocument();
    doc.chrome.logoScale = 1.95;
    doc.header.scale = 1.1;
    doc.header.paddingY = 12;
    doc.brands.logoScale = 1.4;
    doc.brands.gap = 16;
    doc.brands.speed = 1.5;
    doc.typography.headingColor = "#112233";
    doc.typography.accentColor = "#ff6600";
    doc.typography.headingScale = 1.2;
    doc.slider.desktop.heightPx = 320;
    doc.slider.desktop.marginY = -8;
    doc.slider.desktop.objectFit = "cover";
    const vars = layoutCssVars(doc, "desktop");
    assert.equal(vars["--layout-logo-scale"], String(1.95 * 1.1));
    assert.equal(vars["--layout-header-pad-y"], "12px");
    assert.equal(vars["--layout-brands-logo-scale"], "1.4");
    assert.equal(vars["--layout-brands-gap"], "16px");
    assert.equal(vars["--layout-brands-speed"], "1.5");
    assert.equal(vars["--layout-heading-color"], "#112233");
    assert.equal(vars["--layout-accent"], "#ff6600");
    assert.equal(vars["--layout-heading-scale"], "1.2");
    assert.equal(vars["--layout-banner-height"], "320px");
    assert.equal(vars["--layout-banner-aspect"], "auto");
    assert.equal(vars["--layout-banner-margin-y"], "-8px");
    assert.equal(vars["--layout-banner-object-fit"], "cover");

    const auto = layoutCssVars(defaultLayoutDocument(), "desktop");
    assert.equal(auto["--layout-banner-height"], "auto");
    assert.equal(auto["--layout-banner-aspect"], "2.4 / 1");
  });

  it("normalizes builder content draft", () => {
    const draft = normalizeBuilderContentDraft({
      homepageSections: [{ id: "a" }, { id: "b" }],
      slideOrders: { banner1: ["s1", "s2", 3, ""] },
    });
    assert.equal(draft.homepageSections.length, 2);
    assert.deepEqual(draft.slideOrders.banner1, ["s1", "s2"]);
  });
});
