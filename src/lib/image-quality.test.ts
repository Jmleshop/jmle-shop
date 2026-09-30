import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analyzeRawPixels,
  missingImageQuality,
  qualityBadgeLabel,
  qualityIssueSummary,
  IMAGE_QUALITY_MIN_EDGE,
} from "./image-quality";

function rgba(
  w: number,
  h: number,
  paint: (x: number, y: number) => [number, number, number, number]
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = paint(x, y);
      const i = (y * w + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    }
  }
  return data;
}

describe("image-quality", () => {
  it("marks missing images", () => {
    const q = missingImageQuality();
    assert.equal(q.ok, false);
    assert.ok(q.issues.includes("missing"));
    assert.equal(qualityBadgeLabel(q, "de"), "Bild prüfen erforderlich");
  });

  it("flags low resolution", () => {
    const w = 80;
    const h = 80;
    assert.ok(Math.min(w, h) < IMAGE_QUALITY_MIN_EDGE);
    // Sharp checkerboard → high Laplacian, but still low_res
    const data = rgba(w, h, (x, y) =>
      (x + y) % 2 === 0 ? [0, 0, 0, 255] : [255, 255, 255, 255]
    );
    const q = analyzeRawPixels(data, w, h);
    assert.equal(q.ok, false);
    assert.ok(q.issues.includes("low_res"));
  });

  it("flags matte/bad cutout with heavy semi-transparency", () => {
    const w = 120;
    const h = 120;
    const data = rgba(w, h, (x, y) => {
      const inSubject = x > 20 && x < 100 && y > 20 && y < 100;
      if (!inSubject) return [0, 0, 0, 0];
      // Soft matte edges dominate
      return [40, 40, 40, 120];
    });
    const q = analyzeRawPixels(data, w, h);
    assert.equal(q.ok, false);
    assert.ok(q.issues.includes("bad_cutout"));
    assert.match(qualityIssueSummary(q, "de"), /Freistellung/);
  });

  it("accepts a sharp opaque product patch with padding (no alpha issues)", () => {
    // Analyze canvas is often downscaled; here we use sharp noise in center
    const w = 500;
    const h = 500;
    const data = rgba(w, h, (x, y) => {
      const inSubject = x > 80 && x < 420 && y > 80 && y < 420;
      if (!inSubject) return [0, 0, 0, 0];
      const v = ((x * 17 + y * 31) % 255);
      return [v, 255 - v, (x * y) % 255, 255];
    });
    const q = analyzeRawPixels(data, w, h);
    assert.equal(q.ok, true);
    assert.deepEqual(q.issues, []);
    assert.equal(qualityBadgeLabel(q, "de"), "OK");
  });
});
