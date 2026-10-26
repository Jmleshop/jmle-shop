import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sanitizeShopTexts, shopText, shopTextCatalog } from "./shop-i18n";

describe("shop text overrides", () => {
  it("keeps only known keys with non-empty, changed strings", () => {
    const out = sanitizeShopTexts({
      addToCart: "  أضف  ",
      unknownKey: "x",
      cart: "",
      home: 42,
      products: shopText("ar", "products"),
    });
    assert.deepEqual(out, { addToCart: "أضف" });
  });

  it("rejects non-objects", () => {
    assert.deepEqual(sanitizeShopTexts(null), {});
    assert.deepEqual(sanitizeShopTexts(["a"]), {});
  });

  it("uses the override for Arabic only and still fills placeholders", () => {
    const overrides = { wishlistItemsCount: "{count} منتجات" };
    assert.equal(shopText("ar", "wishlistItemsCount", { count: 3 }, overrides), "3 منتجات");
    assert.equal(
      shopText("de", "wishlistItemsCount", { count: 3 }, overrides),
      "3 gespeicherte Produkte"
    );
  });

  it("lists every key for the admin editor", () => {
    const rows = shopTextCatalog();
    assert.ok(rows.length > 100);
    assert.ok(rows.every((r) => r.ar && r.de));
  });
});
