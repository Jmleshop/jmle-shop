import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { alphaBounds, analyzeAlpha, CUTOUT_FILL, CUTOUT_PADDING } from "./bg-postprocess";

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

  it("computes alpha bounding box with safety expand", () => {
    const data = rgba(20, 20, (x, y) =>
      x >= 5 && x <= 14 && y >= 4 && y <= 12 ? [10, 10, 10, 255] : [0, 0, 0, 0]
    );
    const tight = alphaBounds(data, 20, 20, 8, false);
    assert.deepEqual(tight, { x: 5, y: 4, w: 10, h: 9 });
    const expanded = alphaBounds(data, 20, 20, 8, true);
    assert.ok(expanded);
    // Expand darf Motiv nicht verkleinern
    assert.ok(expanded!.x <= 5);
    assert.ok(expanded!.y <= 4);
    assert.ok(expanded!.x + expanded!.w >= 15);
    assert.ok(expanded!.y + expanded!.h >= 13);
  });

  it("uses ~12% padding fill factor", () => {
    assert.ok(Math.abs(CUTOUT_PADDING - 0.12) < 1e-9);
    assert.ok(Math.abs(CUTOUT_FILL - 0.76) < 1e-9);
  });
});
