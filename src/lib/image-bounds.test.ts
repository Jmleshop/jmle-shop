import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_EDGE_BANNER,
  MAX_EDGE_LOGO,
  MAX_EDGE_PRODUCT,
  isLogoFolder,
  maxEdgeForFolder,
} from "./image-bounds";

describe("image-bounds", () => {
  it("detects logo folders", () => {
    assert.equal(isLogoFolder("brand"), true);
    assert.equal(isLogoFolder("logos"), true);
    assert.equal(isLogoFolder("products"), false);
  });

  it("caps products tightly; logos sharper; banners bounded", () => {
    assert.equal(maxEdgeForFolder("brand"), MAX_EDGE_LOGO);
    assert.equal(maxEdgeForFolder("products"), MAX_EDGE_PRODUCT);
    assert.equal(maxEdgeForFolder("banners"), MAX_EDGE_BANNER);
    assert.ok(MAX_EDGE_PRODUCT <= 800);
    assert.ok(MAX_EDGE_BANNER <= 1280);
    assert.ok(MAX_EDGE_LOGO >= 1200);
  });
});
