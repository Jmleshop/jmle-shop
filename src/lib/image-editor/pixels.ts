import { isNeutralAdjustments } from "./presets";
import type { Adjustments } from "./types";

function clampByte(value: number): number {
  if (value < 0) return 0;
  if (value > 255) return 255;
  return Math.round(value);
}

function clampUnit(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}

function hueToRgb(p: number, q: number, t: number): number {
  let hue = t;
  if (hue < 0) hue += 1;
  if (hue > 1) hue -= 1;
  if (hue < 1 / 6) return p + (q - p) * 6 * hue;
  if (hue < 1 / 2) return q;
  if (hue < 2 / 3) return p + (q - p) * (2 / 3 - hue) * 6;
  return p;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hueToRgb(p, q, h + 1 / 3), hueToRgb(p, q, h), hueToRgb(p, q, h - 1 / 3)];
}

function boxBlurRgb(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number
): Uint8ClampedArray {
  const tmp = new Uint8ClampedArray(src.length);
  const out = new Uint8ClampedArray(src.length);
  const opaque = 200;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let k = -radius; k <= radius; k++) {
        const xx = Math.min(width - 1, Math.max(0, x + k));
        const i = (y * width + xx) * 4;
        if (src[i + 3] < opaque) continue;
        r += src[i];
        g += src[i + 1];
        b += src[i + 2];
        n++;
      }
      const o = (y * width + x) * 4;
      tmp[o + 3] = src[o + 3];
      if (n === 0) {
        tmp[o] = src[o];
        tmp[o + 1] = src[o + 1];
        tmp[o + 2] = src[o + 2];
      } else {
        tmp[o] = r / n;
        tmp[o + 1] = g / n;
        tmp[o + 2] = b / n;
      }
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let k = -radius; k <= radius; k++) {
        const yy = Math.min(height - 1, Math.max(0, y + k));
        const i = (yy * width + x) * 4;
        if (tmp[i + 3] < opaque) continue;
        r += tmp[i];
        g += tmp[i + 1];
        b += tmp[i + 2];
        n++;
      }
      const o = (y * width + x) * 4;
      out[o + 3] = src[o + 3];
      if (n === 0) {
        out[o] = src[o];
        out[o + 1] = src[o + 1];
        out[o + 2] = src[o + 2];
      } else {
        out[o] = r / n;
        out[o + 1] = g / n;
        out[o + 2] = b / n;
      }
    }
  }

  return out;
}

function applyColor(data: Uint8ClampedArray, adjustments: Adjustments) {
  const brightness = adjustments.brightness / 100;
  const contrast = adjustments.contrast / 100;
  const contrastFactor = contrast >= 0 ? 1 + contrast * 1.5 : 1 + contrast * 0.75;
  const highlights = adjustments.highlights / 100;
  const shadows = adjustments.shadows / 100;
  const whites = adjustments.whites / 100;
  const blacks = adjustments.blacks / 100;
  const hueShift = adjustments.hue / 360;
  const temperature = adjustments.temperature / 100;
  const vibrance = adjustments.vibrance / 100;
  const saturation = adjustments.saturation / 100;
  const needHsl = hueShift !== 0 || vibrance !== 0 || saturation !== 0;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;

    let r = data[i] / 255;
    let g = data[i + 1] / 255;
    let b = data[i + 2] / 255;

    r = clampUnit(r + temperature * 0.18);
    g = clampUnit(g + temperature * 0.05);
    b = clampUnit(b - temperature * 0.18);

    r = clampUnit(r + brightness * 0.35);
    g = clampUnit(g + brightness * 0.35);
    b = clampUnit(b + brightness * 0.35);

    r = clampUnit((r - 0.5) * contrastFactor + 0.5);
    g = clampUnit((g - 0.5) * contrastFactor + 0.5);
    b = clampUnit((b - 0.5) * contrastFactor + 0.5);

    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const shadowAmt = shadows * 0.5 * (1 - lum) * (1 - lum);
    const highAmt = highlights * 0.5 * lum * lum;
    const blackAmt = blacks * 0.6 * Math.pow(1 - lum, 3);
    const whiteAmt = whites * 0.6 * Math.pow(lum, 3);
    const tone = shadowAmt + highAmt + blackAmt + whiteAmt;
    r = clampUnit(r + tone);
    g = clampUnit(g + tone);
    b = clampUnit(b + tone);

    if (needHsl) {
      let [h, s, l] = rgbToHsl(r, g, b);
      h += hueShift;
      if (h < 0) h += 1;
      if (h >= 1) h -= 1;
      if (vibrance !== 0) s = clampUnit(s + vibrance * (1 - s) * 0.9);
      if (saturation !== 0) {
        s = clampUnit(s + saturation * (saturation > 0 ? 1 - s : s));
      }
      [r, g, b] = hslToRgb(h, s, l);
    }

    data[i] = clampByte(r * 255);
    data[i + 1] = clampByte(g * 255);
    data[i + 2] = clampByte(b * 255);
  }
}

function blendRgb(
  data: Uint8ClampedArray,
  blurred: Uint8ClampedArray,
  amount: number,
  mode: "denoise" | "sharpen"
) {
  const strength = mode === "sharpen" ? amount * 1.35 : amount;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    for (let c = 0; c < 3; c++) {
      const original = data[i + c];
      const smooth = blurred[i + c];
      const next =
        mode === "denoise"
          ? original * (1 - strength) + smooth * strength
          : original + strength * (original - smooth);
      data[i + c] = clampByte(next);
    }
  }
}

/** Wendet Licht, Farbe, Rauschreduzierung und Schärfe auf RGBA-Pixel an. Alpha bleibt erhalten. */
export function applyAdjustments(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  adjustments: Adjustments
): void {
  const colorNeutral =
    adjustments.brightness === 0 &&
    adjustments.contrast === 0 &&
    adjustments.highlights === 0 &&
    adjustments.shadows === 0 &&
    adjustments.whites === 0 &&
    adjustments.blacks === 0 &&
    adjustments.hue === 0 &&
    adjustments.temperature === 0 &&
    adjustments.vibrance === 0 &&
    adjustments.saturation === 0;

  if (!colorNeutral) applyColor(data, adjustments);

  if (adjustments.noiseReduction > 0) {
    const radius = adjustments.noiseReduction > 60 ? 2 : 1;
    const blurred = boxBlurRgb(data, width, height, radius);
    blendRgb(data, blurred, adjustments.noiseReduction / 100, "denoise");
  }

  if (adjustments.sharpness > 0) {
    const blurred = boxBlurRgb(data, width, height, 1);
    blendRgb(data, blurred, adjustments.sharpness / 100, "sharpen");
  }
}

export function hasAnyAdjustment(adjustments: Adjustments): boolean {
  return !isNeutralAdjustments(adjustments);
}
