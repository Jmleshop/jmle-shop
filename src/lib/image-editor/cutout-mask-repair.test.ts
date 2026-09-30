import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isStudioMattePixel,
  opaqueCoreBounds,
  repairCutoutMask,
} from "./cutout-mask-repair";

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

describe("cutout-mask-repair", () => {
  it("fills punched holes inside a product silhouette", () => {
    // 20x20: solid ring/frame with a hole (logo punched out) in the center
    const data = rgba(20, 20, (x, y) => {
      const inOuter = x >= 4 && x <= 15 && y >= 4 && y <= 15;
      const inHole = x >= 8 && x <= 11 && y >= 8 && y <= 11;
      if (inOuter && !inHole) return [180, 40, 40, 255];
      if (inHole) return [180, 40, 40, 20]; // RGB still product, alpha punched
      return [255, 255, 255, 0];
    });

    repairCutoutMask(data, 20, 20, { closeRadius: 2 });

    // Center hole must be restored opaque
    const center = (10 * 20 + 10) * 4;
    assert.equal(data[center + 3], 255);
    assert.equal(data[center], 180);

    // Outside stays transparent
    assert.equal(data[3], 0);
  });

  it("removes soft studio matte outside the product", () => {
    const data = rgba(16, 16, (x, y) => {
      if (x >= 5 && x <= 10 && y >= 5 && y <= 10) return [30, 30, 30, 255];
      // Soft cream halo around product (the "box")
      if (x >= 3 && x <= 12 && y >= 3 && y <= 12) return [255, 247, 237, 80];
      return [0, 0, 0, 0];
    });

    repairCutoutMask(data, 16, 16, { closeRadius: 2 });

    const halo = (4 * 16 + 4) * 4;
    assert.equal(data[halo + 3], 0);
    assert.equal(data[halo], 0);

    const core = (7 * 16 + 7) * 4;
    assert.equal(data[core + 3], 255);
  });

  it("detects cream/gray matte pixels", () => {
    assert.equal(isStudioMattePixel(255, 247, 237, 90), true);
    assert.equal(isStudioMattePixel(248, 248, 248, 120), true);
    assert.equal(isStudioMattePixel(200, 40, 40, 255), false);
  });

  it("computes opaque core bounds without soft halo", () => {
    const data = rgba(20, 20, (x, y) => {
      if (x >= 6 && x <= 13 && y >= 6 && y <= 13) return [10, 10, 10, 255];
      if (x >= 4 && x <= 15 && y >= 4 && y <= 15) return [255, 255, 255, 40];
      return [0, 0, 0, 0];
    });
    const box = opaqueCoreBounds(data, 20, 20, 128);
    assert.deepEqual(box, { x: 6, y: 6, w: 8, h: 8 });
  });

  it("reconnects a nearby logo island to the product body", () => {
    // Main body + logo island separated by 2px gap with residual product RGB
    const data = rgba(24, 24, (x, y) => {
      if (x >= 4 && x <= 14 && y >= 8 && y <= 18) return [40, 120, 200, 255];
      if (x >= 17 && x <= 20 && y >= 10 && y <= 13) return [40, 120, 200, 255];
      if (x >= 15 && x <= 16 && y >= 10 && y <= 13) return [40, 120, 200, 40];
      return [255, 255, 255, 0];
    });
    repairCutoutMask(data, 24, 24, { closeRadius: 3 });
    const bridge = (11 * 24 + 15) * 4;
    assert.equal(data[bridge + 3], 255);
    const logo = (11 * 24 + 18) * 4;
    assert.equal(data[logo + 3], 255);
  });
});
