import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  absoluteFetchableIconUrl,
  faviconMetadataIcons,
} from "./favicon";

describe("favicon metadata", () => {
  it("always uses app proxy routes — never raw Supabase Storage", () => {
    const icons = faviconMetadataIcons(
      "https://example.supabase.co/storage/v1/object/public/logos/jmle.webp"
    );
    assert.equal(icons.icon[0].url, "/icon");
    assert.equal(icons.icon[0].type, "image/png");
    assert.equal(icons.apple[0].url, "/apple-icon");
    assert.equal(icons.shortcut, "/icon");
  });

  it("falls back to the same proxy routes when logo is empty", () => {
    const icons = faviconMetadataIcons("");
    assert.equal(icons.icon[0].url, "/icon");
    assert.equal(icons.apple[0].url, "/apple-icon");
  });

  it("only treats http(s) URLs as fetchable", () => {
    assert.equal(
      absoluteFetchableIconUrl("https://cdn.example/logo.png"),
      "https://cdn.example/logo.png"
    );
    assert.equal(absoluteFetchableIconUrl("/placeholder.svg"), null);
    assert.equal(absoluteFetchableIconUrl(""), null);
  });
});
