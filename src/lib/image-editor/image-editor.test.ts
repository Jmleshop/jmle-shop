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
import { PRESETS, isNeutralAdjustments } from "./presets";
import { DEFAULT_ADJUSTMENTS } from "./types";

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
