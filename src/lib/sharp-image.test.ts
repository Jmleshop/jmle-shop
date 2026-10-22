import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  originalImageSrc,
  vercelOptimizedImageSrc,
} from "./sharp-image";

describe("sharp-image egress helpers", () => {
  it("strips supabase render transforms", () => {
    const src =
      "https://rbdarbzwbzpfjorgeavi.supabase.co/storage/v1/render/image/public/product-images/a.webp?width=800&quality=50";
    const out = originalImageSrc(src);
    assert.match(out, /\/object\/public\//);
    assert.doesNotMatch(out, /width=/);
  });

  it("builds a next/image URL for raw img tags", () => {
    const src =
      "https://rbdarbzwbzpfjorgeavi.supabase.co/storage/v1/object/public/product-images/a.webp";
    const out = vercelOptimizedImageSrc(src, 96);
    assert.ok(out.startsWith("/_next/image?"));
    assert.match(out, /w=96/);
    assert.match(out, /q=75/);
    assert.ok(out.includes(encodeURIComponent(src)));
  });

  it("leaves local placeholders alone", () => {
    assert.equal(vercelOptimizedImageSrc("/placeholder.svg", 64), "/placeholder.svg");
  });
});
