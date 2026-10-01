import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  IMAGE_BG_BANNER,
  IMAGE_BG_PRODUCT,
  MAX_EDGE_BANNER,
  MAX_EDGE_LOGO,
  MAX_EDGE_PRODUCT,
  isBannerFolder,
  isLogoFolder,
  maxEdgeForFolder,
  policyForFolder,
  policyForRole,
  roleForFolder,
} from "./image-policy";

describe("image-policy", () => {
  it("maps folders to roles", () => {
    assert.equal(roleForFolder("products"), "product");
    assert.equal(roleForFolder("categories"), "category");
    assert.equal(roleForFolder("banners"), "banner");
    assert.equal(roleForFolder("slides"), "banner");
    assert.equal(roleForFolder("brand"), "logo");
    assert.equal(roleForFolder("brands"), "logo");
  });

  it("product: white contain 1:1 with display padding once", () => {
    const p = policyForRole("product");
    assert.equal(p.objectFit, "contain");
    assert.equal(p.frameBackground, IMAGE_BG_PRODUCT);
    assert.equal(p.aspect, "1:1");
    assert.equal(p.editorMode, "adjust-square");
    assert.ok(p.paddingRatio > 0);
    assert.ok(p.bakeFill >= 0.9);
    assert.equal(p.displayQuality, 75);
  });

  it("category: white cover full-bleed", () => {
    const p = policyForRole("category");
    assert.equal(p.objectFit, "cover");
    assert.equal(p.frameBackground, IMAGE_BG_PRODUCT);
    assert.equal(p.paddingRatio, 0);
    assert.equal(p.bakeFill, 1);
  });

  it("banner: cream contain preserve aspect, no square editor", () => {
    const p = policyForFolder("banners");
    assert.equal(p.objectFit, "contain");
    assert.equal(p.frameBackground, IMAGE_BG_BANNER);
    assert.equal(p.aspect, "preserve");
    assert.equal(p.editorMode, "none");
    assert.equal(p.allowEditor, false);
  });

  it("logo: transparent contain, higher storage quality", () => {
    const p = policyForFolder("brand");
    assert.equal(p.objectFit, "contain");
    assert.equal(p.frameBackground, null);
    assert.equal(p.aspect, "preserve");
    assert.equal(p.editorMode, "none");
    assert.ok(p.storageQuality >= 0.9);
  });

  it("keeps folder helpers and edge caps", () => {
    assert.equal(isLogoFolder("logos"), true);
    assert.equal(isBannerFolder("hero"), true);
    assert.equal(maxEdgeForFolder("products"), MAX_EDGE_PRODUCT);
    assert.equal(maxEdgeForFolder("banners"), MAX_EDGE_BANNER);
    assert.equal(maxEdgeForFolder("brand"), MAX_EDGE_LOGO);
  });
});
