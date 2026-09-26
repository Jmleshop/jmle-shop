import { DEFAULT_ADJUSTMENTS, type Adjustments } from "./types";

function percentile(hist: Uint32Array, count: number, p: number): number {
  const target = Math.max(1, Math.round(count * p));
  let seen = 0;
  for (let i = 0; i < hist.length; i++) {
    seen += hist[i];
    if (seen >= target) return i;
  }
  return 255;
}

function clampSlider(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

/**
 * Leitet Reglerwerte aus dem Histogramm ab (Auto-Tonwert, Lebendigkeit, leichte Schärfe).
 * Transparente Pixel (Freisteller) werden ignoriert.
 */
export function suggestEnhance(data: Uint8ClampedArray): Adjustments {
  const hist = new Uint32Array(256);
  let count = 0;
  let sum = 0;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 20) continue;
    const y = Math.round(
      0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
    );
    const lum = Math.max(0, Math.min(255, y));
    hist[lum]++;
    sum += lum;
    count++;
  }

  if (count < 16) {
    return {
      ...DEFAULT_ADJUSTMENTS,
      brightness: 8,
      contrast: 12,
      vibrance: 16,
      sharpness: 14,
    };
  }

  const pLow = percentile(hist, count, 0.02);
  const pHigh = percentile(hist, count, 0.98);
  const mean = sum / count;
  const spread = pHigh - pLow;

  return {
    ...DEFAULT_ADJUSTMENTS,
    brightness: clampSlider(mean < 105 ? 14 : mean < 128 ? 8 : mean > 185 ? -8 : 4, -20, 22),
    contrast: clampSlider(spread < 150 ? 22 : 12, 6, 28),
    highlights: -6,
    shadows: clampSlider(pLow > 25 ? 14 : 8, 0, 24),
    whites: clampSlider(((248 - pHigh) / 70) * 36, -8, 36),
    blacks: clampSlider(-((pLow - 6) / 70) * 36, -40, 8),
    vibrance: 18,
    saturation: 6,
    sharpness: 16,
    noiseReduction: 8,
    hue: 0,
    temperature: 0,
  };
}
