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
  /** Lokaler Kontrast (weitere Unsharp-Maske) für Verpackung und Text. */
  clarity: number;
  noiseReduction: number;
  /** Gezieltes Nachschärfen von Kanten (Etikettentext). */
  labelSharpness: number;
  /** Hebt Rot, Gelb und Grün an. */
  foodBoost: number;
  /** Dämpft ausgebrannte Reflexionen. */
  deflare: number;
  /** Weicher Glanzpunkt. */
  specular: number;
  /** Spiegelt die Hälften ineinander (Gläser, Flaschen). */
  symmetry: number;
  /** Alpha-Schwelle des Freistellers, 0 = aus. */
  alphaThreshold: number;
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
  clarity: 0,
  noiseReduction: 0,
  labelSharpness: 0,
  foodBoost: 0,
  deflare: 0,
  specular: 0,
  symmetry: 0,
  alphaThreshold: 0,
};

export type BackgroundMode = "white" | "transparent" | "color";

export type ShadowMode = "none" | "drop" | "contact" | "both";

export type StudioBackground = "none" | "neutral" | "marble" | "wood";

export type HealSpot = { x: number; y: number; r: number };

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
  straighten?: number;
  shadow?: ShadowMode;
  backgroundColor?: string;
  watermark?: boolean;
  studio?: StudioBackground;
  margin?: boolean;
  heal?: HealSpot[];
  /** WebP/PNG encoder quality, 70–100. Default is high quality. */
  exportQuality?: number;
  /** 0 keeps the source edge (capped at 2000). 1500 and 2000 force that square. */
  upscale?: UpscaleTarget;
};

export const DEFAULT_EXPORT_QUALITY = 95;
export const MIN_EXPORT_QUALITY = 70;
export type UpscaleTarget = 0 | 1500 | 2000;

export function clampExportQuality(value: number | undefined): number {
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : DEFAULT_EXPORT_QUALITY;
  return Math.min(100, Math.max(MIN_EXPORT_QUALITY, Math.round(numeric)));
}

export function resolveExportEdge(sourceLongest: number, upscale: UpscaleTarget | undefined): number {
  if (upscale === 1500 || upscale === 2000) return upscale;
  return Math.min(EXPORT_SIZE, Math.max(1, sourceLongest));
}

/** Square export cap. The Ultra-HD option may still scale up to this size. */
export const EXPORT_SIZE = 2000;

/** Shorter edge below this triggers the low-resolution warning in the editor. */
export const MIN_SOURCE_EDGE = 800;

export type PresetId =
  | "original"
  | "strahlend"
  | "dramatisch"
  | "strahlendKalt"
  | "strahlendWarm"
  | "frisch"
  | "backwaren"
  | "konserven";
