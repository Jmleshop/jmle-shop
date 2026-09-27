import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { suggestEnhance } from "./auto-enhance";
import {
  cropPixels,
  fitCrop,
  orientedAspect,
  pixelAspectOf,
  resizeCrop,
  squarePlacement,
  transformedOutputSize,
} from "./geometry";
import { applyAdjustments } from "./pixels";
import { applySymmetry, smartBounds, suggestTemperature } from "./studio";
import { PRESETS, isNeutralAdjustments } from "./presets";
import { estimateExportBytes } from "./export-size";
import { productFrame, productPixelBounds, shouldReframe } from "./product-bounds";
import { DEFAULT_ADJUSTMENTS, clampExportQuality, resolveExportEdge } from "./types";

function solid(width: number, height: number, rgba: [number, number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = rgba[0];
    data[i + 1] = rgba[1];
    data[i + 2] = rgba[2];
    data[i + 3] = rgba[3];
  }
  return data;
}

describe("image editor geometry", () => {
  it("fits a landscape photo into a centered square crop", () => {
    const crop = fitCrop(2, 1);
    assert.equal(crop.w, 0.5);
    assert.equal(crop.h, 1);
    assert.equal(crop.x, 0.25);
    assert.equal(crop.y, 0);
    assert.ok(Math.abs(pixelAspectOf(crop, 2) - 1) < 0.001);
  });

  it("fits 16:9 and 4:3 and keeps the original frame", () => {
    const wide = fitCrop(1, 16 / 9);
    assert.ok(Math.abs(pixelAspectOf(wide, 1) - 16 / 9) < 0.001);
    const classic = fitCrop(1, 4 / 3);
    assert.ok(Math.abs(pixelAspectOf(classic, 1) - 4 / 3) < 0.001);
    assert.deepEqual(fitCrop(1.5, null), { x: 0, y: 0, w: 1, h: 1 });
    assert.deepEqual(fitCrop(1.5, 1.5), { x: 0, y: 0, w: 1, h: 1 });
  });

  it("letterboxes a wide crop inside the square export", () => {
    const place = squarePlacement(200, 100, 1400);
    assert.equal(place.dw, 1400);
    assert.equal(place.dh, 700);
    assert.equal(place.dx, 0);
    assert.equal(place.dy, 350);
  });

  it("fills the square when the crop is already square", () => {
    const place = squarePlacement(800, 800, 1400);
    assert.equal(place.dw, 1400);
    assert.equal(place.dh, 1400);
    assert.equal(place.dx, 0);
    assert.equal(place.dy, 0);
  });

  it("maps a normalized crop onto source pixels", () => {
    const pixels = cropPixels({ x: 0.25, y: 0, w: 0.5, h: 1 }, 1000, 500);
    assert.equal(pixels.x, 250);
    assert.equal(pixels.y, 0);
    assert.equal(pixels.w, 500);
    assert.equal(pixels.h, 500);
  });

  it("swaps the preview size on 90 degree rotation", () => {
    const landscape = transformedOutputSize(2000, 1000, 0, 1000);
    assert.deepEqual(
      { width: landscape.width, height: landscape.height },
      { width: 1000, height: 500 }
    );
    const turned = transformedOutputSize(2000, 1000, 90, 1000);
    assert.deepEqual([turned.width, turned.height], [500, 1000]);
    assert.equal(orientedAspect(2000, 1000, 90), 0.5);
  });

  it("keeps a locked square crop square while resizing", () => {
    const start = { x: 0.2, y: 0.2, w: 0.3, h: 0.6 };
    const next = resizeCrop(start, "se", 0.05, 0, 0.5);
    assert.ok(Math.abs(next.w / next.h - 0.5) < 0.02);
    assert.ok(Math.abs(pixelAspectOf(next, 2) - 1) < 0.05);
  });

  it("clamps a moved crop inside the frame", () => {
    const next = resizeCrop({ x: 0.8, y: 0.8, w: 0.3, h: 0.3 }, "move", 0.5, 0.5, null);
    assert.ok(next.x + next.w <= 1.001);
    assert.ok(next.y + next.h <= 1.001);
    assert.ok(next.x >= 0 && next.y >= 0);
  });
});

describe("image editor pixels", () => {
  it("leaves pixels untouched when every slider is zero", () => {
    const data = solid(2, 1, [40, 80, 120, 255]);
    const before = data.slice();
    applyAdjustments(data, 2, 1, DEFAULT_ADJUSTMENTS);
    assert.deepEqual(Array.from(data), Array.from(before));
    assert.equal(isNeutralAdjustments(PRESETS.original), true);
    assert.equal(isNeutralAdjustments(PRESETS.strahlend), false);
  });

  it("raises brightness without touching alpha or empty pixels", () => {
    const data = solid(1, 2, [100, 100, 100, 255]);
    data[7] = 0;
    applyAdjustments(data, 1, 2, { ...DEFAULT_ADJUSTMENTS, brightness: 100 });
    assert.ok(data[0] > 100);
    assert.equal(data[3], 255);
    assert.equal(data[4], 100);
    assert.equal(data[7], 0);
  });

  it("cools the temperature by shifting blue up and red down", () => {
    const data = solid(1, 1, [140, 140, 140, 255]);
    applyAdjustments(data, 1, 1, { ...DEFAULT_ADJUSTMENTS, temperature: -100 });
    assert.ok(data[2] > data[0]);
  });

  it("sharpens an edge instead of a flat field", () => {
    const flat = solid(4, 1, [120, 120, 120, 255]);
    const flatBefore = flat[0];
    applyAdjustments(flat, 4, 1, { ...DEFAULT_ADJUSTMENTS, sharpness: 100 });
    assert.ok(Math.abs(flat[0] - flatBefore) <= 1);

    const edge = solid(6, 1, [40, 40, 40, 255]);
    for (let x = 3; x < 6; x++) {
      edge[x * 4] = 200;
      edge[x * 4 + 1] = 200;
      edge[x * 4 + 2] = 200;
    }
    const darkNeighbor = edge[2 * 4];
    const brightNeighbor = edge[3 * 4];
    applyAdjustments(edge, 6, 1, { ...DEFAULT_ADJUSTMENTS, sharpness: 100 });
    assert.ok(edge[2 * 4] <= darkNeighbor);
    assert.ok(edge[3 * 4] >= brightNeighbor);
  });

  it("raises local contrast with clarity without shifting a flat field", () => {
    const flat = solid(8, 1, [120, 120, 120, 255]);
    const before = flat[0];
    applyAdjustments(flat, 8, 1, { ...DEFAULT_ADJUSTMENTS, clarity: 100 });
    assert.ok(Math.abs(flat[0] - before) <= 1);

    const edge = solid(12, 1, [40, 40, 40, 255]);
    for (let x = 6; x < 12; x++) {
      edge[x * 4] = 210;
      edge[x * 4 + 1] = 210;
      edge[x * 4 + 2] = 210;
    }
    const dark = edge[4 * 4];
    const bright = edge[7 * 4];
    applyAdjustments(edge, 12, 1, { ...DEFAULT_ADJUSTMENTS, clarity: 100 });
    assert.ok(edge[4 * 4] <= dark);
    assert.ok(edge[7 * 4] >= bright);
  });
});

describe("export size", () => {
  it("defaults to 95 and keeps the chosen Ultra-HD edge", () => {
    assert.equal(clampExportQuality(undefined), 95);
    assert.equal(clampExportQuality(40), 92);
    assert.equal(clampExportQuality(120), 95);
    assert.equal(resolveExportEdge(800, 0), 800);
    assert.equal(resolveExportEdge(800, 2000), 2000);
    assert.equal(resolveExportEdge(4000, 1500), 1500);
  });

  it("scales a preview blob up to the export edge", () => {
    assert.equal(estimateExportBytes(1000, 100, 200, 1), 4000);
    assert.equal(estimateExportBytes(1000, 720, 2000, 0.72), Math.round(1000 * (2000 / 720) ** 2 * 0.72));
  });
});

describe("auto enhance", () => {
  it("lifts a dark product photo", () => {
    const data = solid(8, 8, [30, 28, 26, 255]);
    const next = suggestEnhance(data);
    assert.ok(next.brightness > 0);
    assert.ok(next.contrast > 0);
    assert.ok(next.vibrance > 0);
    assert.ok(next.sharpness > 0);
  });
});

describe("studio tools", () => {
  it("mirrors a pixel when symmetry is full", () => {
    const data = solid(4, 1, [0, 0, 0, 255]);
    data[0] = 255;
    applySymmetry(data, 4, 1, 1);
    assert.equal(data[0], 128);
    assert.equal(data[(4 - 1) * 4], 128);
  });

  it("cools a yellow cast", () => {
    const data = solid(2, 2, [220, 180, 80, 255]);
    assert.ok(suggestTemperature(data) < 0);
  });

  it("finds the opaque product instead of the frame", () => {
    const data = solid(10, 10, [0, 0, 0, 0]);
    for (let y = 3; y <= 6; y++) {
      for (let x = 4; x <= 7; x++) {
        const i = (y * 10 + x) * 4;
        data[i] = 200;
        data[i + 1] = 40;
        data[i + 2] = 20;
        data[i + 3] = 255;
      }
    }
    const rect = smartBounds(data, 10, 10);
    assert.ok(rect);
    assert.ok(rect.x < 0.5);
    assert.ok(rect.w < 1);
  });

  it("drops a near-white studio margin and keeps the package", () => {
    const data = solid(20, 20, [250, 250, 250, 255]);
    for (let y = 6; y <= 13; y++) {
      for (let x = 7; x <= 12; x++) {
        const i = (y * 20 + x) * 4;
        data[i] = 180;
        data[i + 1] = 40;
        data[i + 2] = 30;
      }
    }
    const box = productPixelBounds(data, 20, 20);
    assert.ok(box);
    assert.equal(box.x, 7);
    assert.equal(box.y, 6);
    assert.equal(box.w, 6);
    assert.equal(box.h, 8);
    assert.equal(shouldReframe(box, 20, 20), true);
    const framed = productFrame(box.w, box.h, 1000);
    assert.equal(framed.dh, 880);
    assert.ok(framed.dy >= 50 && framed.dy <= 70);
  });
});
