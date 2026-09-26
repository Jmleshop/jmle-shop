import type { HealSpot, NormRect } from "./types";

function clampByte(value: number): number {
  if (value < 0) return 0;
  if (value > 255) return 255;
  return Math.round(value);
}

/** Schärft nur deutliche Kanten, damit Etikettentext lesbarer wird. */
export function applyLabelSharpen(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  amount: number
): void {
  if (amount <= 0) return;
  const src = new Uint8ClampedArray(data);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4;
      if (src[i + 3] < 200) continue;
      let edge = 0;
      const samples: number[][] = [];
      for (let c = 0; c < 3; c++) {
        const center = src[i + c];
        const around =
          src[((y - 1) * width + x) * 4 + c] +
          src[((y + 1) * width + x) * 4 + c] +
          src[(y * width + x - 1) * 4 + c] +
          src[(y * width + x + 1) * 4 + c];
        const smooth = around / 4;
        samples.push([center, smooth]);
        edge = Math.max(edge, Math.abs(center - smooth));
      }
      if (edge < 10) continue;
      const gain = amount * Math.min(1, edge / 40) * 1.6;
      for (let c = 0; c < 3; c++) {
        const [center, smooth] = samples[c];
        data[i + c] = clampByte(center + gain * (center - smooth));
      }
    }
  }
}

export function applySymmetry(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  amount: number
): void {
  if (amount <= 0 || width < 2) return;
  const src = new Uint8ClampedArray(data);
  const t = Math.max(0, Math.min(1, amount));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const mirror = width - 1 - x;
      const i = (y * width + x) * 4;
      const j = (y * width + mirror) * 4;
      if (src[i + 3] < 20 && src[j + 3] < 20) continue;
      for (let c = 0; c < 4; c++) {
        const average = (src[i + c] + src[j + c]) / 2;
        data[i + c] = clampByte(src[i + c] * (1 - t) + average * t);
      }
    }
  }
}

export function applySpecular(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  amount: number
): void {
  if (amount <= 0) return;
  const cx = width * 0.5;
  const cy = height * 0.28;
  const rx = width * 0.22;
  const ry = height * 0.12;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 200) continue;
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      const d = nx * nx + ny * ny;
      if (d >= 1) continue;
      const k = (1 - d) * amount * 0.55;
      data[i] = clampByte(data[i] + 255 * k);
      data[i + 1] = clampByte(data[i + 1] + 255 * k);
      data[i + 2] = clampByte(data[i + 2] + 255 * k);
    }
  }
}

export function applyAlphaThreshold(data: Uint8ClampedArray, amount: number): void {
  if (amount <= 0) return;
  const cut = amount * 255;
  for (let i = 3; i < data.length; i += 4) {
    const alpha = data[i];
    if (alpha < cut) data[i] = 0;
    else if (alpha < 250) data[i] = clampByte(alpha + (255 - cut) * 0.2);
  }
}

export function healSpots(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  spots: HealSpot[]
): void {
  for (const spot of spots) {
    const cx = Math.round(spot.x * width);
    const cy = Math.round(spot.y * height);
    const radius = Math.max(2, Math.round(spot.r * Math.min(width, height)));
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    const outer = radius + 4;
    for (let y = cy - outer; y <= cy + outer; y++) {
      for (let x = cx - outer; x <= cx + outer; x++) {
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.hypot(dx, dy);
        if (dist < radius + 1 || dist > outer) continue;
        const i = (y * width + x) * 4;
        if (data[i + 3] < 20) continue;
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        n++;
      }
    }
    if (!n) continue;
    const ar = r / n;
    const ag = g / n;
    const ab = b / n;
    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > radius) continue;
        const i = (y * width + x) * 4;
        const blend = 1 - dist / (radius + 0.001);
        data[i] = clampByte(data[i] * (1 - blend) + ar * blend);
        data[i + 1] = clampByte(data[i + 1] * (1 - blend) + ag * blend);
        data[i + 2] = clampByte(data[i + 2] * (1 - blend) + ab * blend);
      }
    }
  }
}

export function meanLuminance(data: Uint8ClampedArray): number {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 20) continue;
    sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    count++;
  }
  return count ? sum / count : 0;
}

/** Grauwelt-Weißabgleich: Gelbstich (Rot > Blau) wird kühler korrigiert. */
export function suggestTemperature(data: Uint8ClampedArray): number {
  let r = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 20) continue;
    r += data[i];
    b += data[i + 2];
    n++;
  }
  if (!n) return 0;
  const bias = (r / n - b / n) / 255;
  return Math.max(-40, Math.min(40, Math.round(-bias * 120)));
}

export function consistencyVerdict(
  luminance: number,
  straighten: number
): { ok: boolean; labelDe: string; labelAr: string } {
  const exposureOk = luminance >= 105 && luminance <= 175;
  const levelOk = Math.abs(straighten) <= 3;
  const ok = exposureOk && levelOk;
  if (ok) {
    return {
      ok: true,
      labelDe: "Belichtung und Ausrichtung passen",
      labelAr: "التعريض والمحاذاة مناسبان",
    };
  }
  const partsDe = [
    !exposureOk ? (luminance < 105 ? "zu dunkel" : "zu hell") : "",
    !levelOk ? "nicht gerade" : "",
  ].filter(Boolean);
  const partsAr = [
    !exposureOk ? (luminance < 105 ? "داكن" : "ساطع") : "",
    !levelOk ? "مائل" : "",
  ].filter(Boolean);
  return {
    ok: false,
    labelDe: `Abweichung: ${partsDe.join(", ")}`,
    labelAr: `انحراف: ${partsAr.join("، ")}`,
  };
}

/** Umschließt deckende Pixel und lässt rundherum Luft für den Smart-Crop. */
export function smartBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number
): NormRect | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  const corner = data[0] + data[1] + data[2];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 24) continue;
      const sum = data[i] + data[i + 1] + data[i + 2];
      if (Math.abs(sum - corner) < 18 && data[i + 3] > 240) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX || maxY < minY) return null;
  const padX = Math.round((maxX - minX) * 0.06);
  const padY = Math.round((maxY - minY) * 0.06);
  const x0 = Math.max(0, minX - padX);
  const y0 = Math.max(0, minY - padY);
  const x1 = Math.min(width - 1, maxX + padX);
  const y1 = Math.min(height - 1, maxY + padY);
  return {
    x: x0 / width,
    y: y0 / height,
    w: Math.max(0.05, (x1 - x0 + 1) / width),
    h: Math.max(0.05, (y1 - y0 + 1) / height),
  };
}
