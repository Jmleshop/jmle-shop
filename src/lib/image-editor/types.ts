export type Adjustments = {
  brightness: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  hue: number;
  temperature: number;
  vibrance: number;
  saturation: number;
  sharpness: number;
  noiseReduction: number;
};

export const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  hue: 0,
  temperature: 0,
  vibrance: 0,
  saturation: 0,
  sharpness: 0,
  noiseReduction: 0,
};

export type BackgroundMode = "white" | "transparent";

export type QuarterTurn = 0 | 90 | 180 | 270;

/** free = frei, original = Bildseitenverhältnis, square = 1:1, wide = 16:9, classic = 4:3 */
export type CropAspectId = "free" | "original" | "square" | "wide" | "classic";

/** Ausschnitt in Anteilen der transformierten Bildfläche (0–1). */
export type NormRect = { x: number; y: number; w: number; h: number };

export const FULL_FRAME: NormRect = { x: 0, y: 0, w: 1, h: 1 };

export type RenderSettings = {
  adjustments: Adjustments;
  rotation: QuarterTurn;
  flipH: boolean;
  flipV: boolean;
  crop: NormRect;
  background: BackgroundMode;
};

export const EXPORT_SIZE = 1400;

export type PresetId =
  | "original"
  | "strahlend"
  | "dramatisch"
  | "strahlendKalt"
  | "strahlendWarm";
