import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analyzeRawPixels,
  missingImageQuality,
  corruptImageQuality,
  unknownOkQuality,
  qualityBadgeLabel,
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

  it("marks corrupt images", () => {
    const q = corruptImageQuality();
    assert.equal(q.ok, false);
    assert.ok(q.issues.includes("corrupt"));
  });

  it("does not red-flag unknown/CORS results", () => {
    const q = unknownOkQuality();
    assert.equal(q.ok, true);
    assert.deepEqual(q.issues, []);
  });

  it("flags only extreme low resolution (<150px)", () => {
    assert.equal(IMAGE_QUALITY_MIN_EDGE, 150);
    const tiny = analyzeRawPixels(
      rgba(80, 80, () => [10, 20, 30, 255]),
      80,
      80
    );
    assert.equal(tiny.ok, false);
    assert.ok(tiny.issues.includes("low_res"));

    const okSize = analyzeRawPixels(
      rgba(200, 200, () => [10, 20, 30, 255]),
      200,
      200
    );
    assert.equal(okSize.ok, true);
    assert.deepEqual(okSize.issues, []);
  });

  it("accepts normal product-sized images even with soft alpha", () => {
    const w = 400;
    const h = 400;
    const data = rgba(w, h, (x, y) => {
      const inSubject = x > 40 && x < 360 && y > 40 && y < 360;
      if (!inSubject) return [0, 0, 0, 0];
      // Soft edges would previously false-positive as bad_cutout
      const edge = x < 50 || x > 350 || y < 50 || y > 350;
      return edge ? [40, 40, 40, 120] : [80, 40, 20, 255];
    });
    const q = analyzeRawPixels(data, w, h);
    assert.equal(q.ok, true);
    assert.deepEqual(q.issues, []);
    assert.equal(qualityBadgeLabel(q, "de"), "OK");
  });
});
