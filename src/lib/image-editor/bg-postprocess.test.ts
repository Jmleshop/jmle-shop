import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { alphaBounds, analyzeAlpha, CUTOUT_FILL } from "./bg-postprocess";

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

describe("bg-postprocess", () => {
  it("detects cutout transparency", () => {
    const data = rgba(10, 10, (x, y) =>
      x >= 3 && x <= 6 && y >= 3 && y <= 6 ? [20, 20, 20, 255] : [0, 0, 0, 0]
    );
    const stats = analyzeAlpha(data, 10, 10);
    assert.equal(stats.hasCutout, true);
    assert.ok(stats.transparent > 0);
  });

  it("rejects fully opaque images", () => {
    const data = rgba(8, 8, () => [200, 100, 50, 255]);
    assert.equal(analyzeAlpha(data, 8, 8).hasCutout, false);
  });

  it("computes alpha bounding box", () => {
    const data = rgba(20, 20, (x, y) =>
      x >= 5 && x <= 14 && y >= 4 && y <= 12 ? [10, 10, 10, 255] : [0, 0, 0, 0]
    );
    const box = alphaBounds(data, 20, 20);
    assert.deepEqual(box, { x: 5, y: 4, w: 10, h: 9 });
  });

  it("uses 10% padding fill factor", () => {
    assert.ok(Math.abs(CUTOUT_FILL - 0.8) < 1e-9);
  });
});
