import { DEFAULT_ADJUSTMENTS, type Adjustments, type PresetId } from "./types";

export const PRESETS: Record<PresetId, Adjustments> = {
  original: { ...DEFAULT_ADJUSTMENTS },
  strahlend: {
    ...DEFAULT_ADJUSTMENTS,
    brightness: 10,
    contrast: 12,
    highlights: 14,
    shadows: 10,
    whites: 8,
    vibrance: 20,
    saturation: 6,
    sharpness: 12,
  },
  dramatisch: {
    ...DEFAULT_ADJUSTMENTS,
    brightness: -4,
    contrast: 32,
    highlights: -12,
    shadows: -18,
    blacks: -16,
    whites: 6,
    saturation: 12,
    vibrance: 8,
    sharpness: 22,
  },
  strahlendKalt: {
    ...DEFAULT_ADJUSTMENTS,
    brightness: 12,
    contrast: 10,
    highlights: 16,
    shadows: 6,
    temperature: -28,
    vibrance: 16,
    sharpness: 10,
  },
  strahlendWarm: {
    ...DEFAULT_ADJUSTMENTS,
    brightness: 10,
    contrast: 8,
    highlights: 12,
    shadows: 8,
    temperature: 30,
    vibrance: 18,
    saturation: 8,
    sharpness: 8,
  },
  frisch: {
    ...DEFAULT_ADJUSTMENTS,
    brightness: 8,
    contrast: 10,
    temperature: -22,
    vibrance: 16,
    foodBoost: 28,
    saturation: 8,
    sharpness: 14,
    labelSharpness: 18,
  },
  backwaren: {
    ...DEFAULT_ADJUSTMENTS,
    brightness: 6,
    contrast: 8,
    temperature: 26,
    highlights: 10,
    vibrance: 14,
    foodBoost: 34,
    saturation: 10,
    sharpness: 8,
  },
  konserven: {
    ...DEFAULT_ADJUSTMENTS,
    contrast: 24,
    highlights: -8,
    shadows: -6,
    blacks: -10,
    vibrance: 10,
    saturation: 8,
    sharpness: 20,
    labelSharpness: 36,
    deflare: 28,
  },
};

export const PRESET_ORDER: PresetId[] = [
  "original",
  "strahlend",
  "dramatisch",
  "strahlendKalt",
  "strahlendWarm",
  "frisch",
  "backwaren",
  "konserven",
];

export function adjustmentsEqual(a: Adjustments, b: Adjustments): boolean {
  return (Object.keys(DEFAULT_ADJUSTMENTS) as (keyof Adjustments)[]).every(
    (key) => a[key] === b[key]
  );
}

export function isNeutralAdjustments(adjustments: Adjustments): boolean {
  return adjustmentsEqual(adjustments, DEFAULT_ADJUSTMENTS);
}
