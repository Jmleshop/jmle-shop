import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { faviconMetadataIcons } from "@/lib/favicon";

describe("favicon metadata", () => {
  it("builds icon links from a shop logo URL", () => {
    const icons = faviconMetadataIcons(
      "https://example.supabase.co/storage/v1/object/public/logos/jmle.webp"
    );
    assert.equal(
      icons.icon[0].url,
      "https://example.supabase.co/storage/v1/object/public/logos/jmle.webp"
    );
    assert.equal(icons.icon[0].type, "image/webp");
    assert.equal(icons.apple[0].url, icons.icon[0].url);
    assert.ok(icons.shortcut);
  });

  it("falls back when logo is empty", () => {
    const icons = faviconMetadataIcons("");
    assert.equal(icons.icon[0].url, "/placeholder.svg");
    assert.equal(icons.icon[0].type, "image/svg+xml");
  });
});
