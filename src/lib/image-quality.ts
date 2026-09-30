/**
 * Bildqualitäts-Analyse für Admin-Produktliste.
 * Erkennt: niedrige Auflösung, Unschärfe, fehlerhafte Freisteller/Matte.
 */

export type ImageQualityIssue =
  | "low_res"
  | "blurry"
  | "bad_cutout"
  | "missing";

export type ImageQualityResult = {
  ok: boolean;
  score: number; // 0–100, höher = besser
  issues: ImageQualityIssue[];
  width: number;
  height: number;
  labelDe: string;
  labelAr: string;
};

export const IMAGE_QUALITY_MIN_EDGE = 400;
/** Laplacian-Varianz unter diesem Wert → unscharf (bei ~256px Analyse). */
export const IMAGE_QUALITY_BLUR_MAX = 55;
/** Anteil weicher Semi-Transparenz am sichtbaren Motiv → Matte/Kasten. */
export const IMAGE_QUALITY_MATTE_RATIO = 0.18;

const ISSUE_COPY: Record<
  ImageQualityIssue,
  { de: string; ar: string }
> = {
  missing: { de: "Kein Bild", ar: "لا صورة" },
  low_res: { de: "Zu geringe Auflösung", ar: "دقة منخفضة" },
  blurry: { de: "Unscharf", ar: "غير واضح" },
  bad_cutout: { de: "Fehlerhafte Freistellung", ar: "قص خلفية خاطئ" },
};

export function qualityBadgeLabel(
  result: ImageQualityResult,
  lang: "de" | "ar" = "de"
): string {
  if (result.ok) return lang === "de" ? "OK" : "جيد";
  return lang === "de" ? "Bild prüfen erforderlich" : "يلزم فحص الصورة";
}

export function qualityIssueSummary(
  result: ImageQualityResult,
  lang: "de" | "ar" = "de"
): string {
  if (result.ok) return "";
  return result.issues
    .map((i) => (lang === "de" ? ISSUE_COPY[i].de : ISSUE_COPY[i].ar))
    .join(" · ");
}

function laplacianVariance(
  data: Uint8ClampedArray,
  width: number,
  height: number
): number {
  // Einfacher Laplacian auf Luminanz (ohne Rand)
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  const lum = (i: number) =>
    0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4;
      const c = lum(i);
      const lap =
        -lum(((y - 1) * width + x) * 4) -
        lum((y * width + (x - 1)) * 4) +
        4 * c -
        lum((y * width + (x + 1)) * 4) -
        lum(((y + 1) * width + x) * 4);
      sum += lap;
      sumSq += lap * lap;
      n += 1;
    }
  }
  if (n < 16) return 999;
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

/** Rohpixel-Analyse (auch für Unit-Tests ohne DOM). */
export function analyzeRawPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number
): ImageQualityResult {
  return withLabels(analyzePixels(data, width, height));
}

function analyzePixels(
  data: Uint8ClampedArray,
  width: number,
  height: number
): Omit<ImageQualityResult, "labelDe" | "labelAr"> {
  const issues: ImageQualityIssue[] = [];
  const minEdge = Math.min(width, height);
  if (minEdge < IMAGE_QUALITY_MIN_EDGE) {
    issues.push("low_res");
  }

  let opaque = 0;
  let translucent = 0;
  let transparent = 0;
  let touchTop = false;
  let touchBottom = false;
  let touchLeft = false;
  let touchRight = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * 4 + 3];
      if (a < 16) {
        transparent += 1;
        continue;
      }
      if (a < 240) translucent += 1;
      else opaque += 1;
      if (y <= 1) touchTop = true;
      if (y >= height - 2) touchBottom = true;
      if (x <= 1) touchLeft = true;
      if (x >= width - 2) touchRight = true;
    }
  }

  const total = Math.max(1, width * height);
  const solid = opaque + translucent;
  const hasAlpha = transparent / total >= 0.02;
  if (hasAlpha && solid > 0) {
    const matteRatio = translucent / solid;
    const clipped =
      touchTop && touchBottom && touchLeft && touchRight && solid / total > 0.55;
    const tinySubject = solid / total < 0.04;
    if (matteRatio >= IMAGE_QUALITY_MATTE_RATIO || clipped || tinySubject) {
      issues.push("bad_cutout");
    }
  }

  // Blur auf verkleinerter Kopie (Performance)
  const blurScore = laplacianVariance(data, width, height);
  if (blurScore < IMAGE_QUALITY_BLUR_MAX) {
    issues.push("blurry");
  }

  let score = 100;
  if (issues.includes("missing")) score -= 100;
  if (issues.includes("low_res")) score -= 35;
  if (issues.includes("blurry")) score -= 30;
  if (issues.includes("bad_cutout")) score -= 40;
  score = Math.max(0, Math.min(100, score));

  return {
    ok: issues.length === 0,
    score,
    issues,
    width,
    height,
  };
}

function withLabels(
  base: Omit<ImageQualityResult, "labelDe" | "labelAr">
): ImageQualityResult {
  const summaryDe = base.issues.map((i) => ISSUE_COPY[i].de).join(" · ");
  const summaryAr = base.issues.map((i) => ISSUE_COPY[i].ar).join(" · ");
  return {
    ...base,
    labelDe: base.ok ? "OK" : summaryDe || "Bild prüfen erforderlich",
    labelAr: base.ok ? "جيد" : summaryAr || "يلزم فحص الصورة",
  };
}

export function missingImageQuality(): ImageQualityResult {
  return withLabels({
    ok: false,
    score: 0,
    issues: ["missing"],
    width: 0,
    height: 0,
  });
}

/** Analysiert ein geladenes ImageBitmap (wird nicht geschlossen). */
export function analyzeImageBitmap(bitmap: ImageBitmap): ImageQualityResult {
  const maxAnalyze = 256;
  const scale = Math.min(1, maxAnalyze / Math.max(bitmap.width, bitmap.height, 1));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return withLabels({
      ok: false,
      score: 40,
      issues: ["low_res"],
      width: bitmap.width,
      height: bitmap.height,
    });
  }
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  const pixels = ctx.getImageData(0, 0, w, h);
  const base = analyzePixels(pixels.data, w, h);
  // Originalmaße für low_res nutzen
  if (Math.min(bitmap.width, bitmap.height) < IMAGE_QUALITY_MIN_EDGE) {
    if (!base.issues.includes("low_res")) base.issues.push("low_res");
    base.ok = false;
    base.score = Math.min(base.score, 65);
  }
  base.width = bitmap.width;
  base.height = bitmap.height;
  return withLabels(base);
}

/** Lädt Bild-URL (CORS) und bewertet Qualität. */
export async function analyzeImageUrl(url: string): Promise<ImageQualityResult> {
  if (!url?.trim()) return missingImageQuality();
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit", cache: "force-cache" });
    if (!res.ok) return missingImageQuality();
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    try {
      return analyzeImageBitmap(bitmap);
    } finally {
      bitmap.close();
    }
  } catch {
    // CORS/Netzwerk — als prüfenswert markieren, nicht hart fehlschlagen
    return withLabels({
      ok: false,
      score: 45,
      issues: ["low_res"],
      width: 0,
      height: 0,
    });
  }
}

/**
 * Sequentiell mit Concurrency: Map productId → quality.
 */
export async function analyzeProductImages(
  items: Array<{ id: string; image: string | null }>,
  options?: {
    concurrency?: number;
    onProgress?: (done: number, total: number) => void;
  }
): Promise<Record<string, ImageQualityResult>> {
  const concurrency = Math.max(1, options?.concurrency ?? 4);
  const out: Record<string, ImageQualityResult> = {};
  let done = 0;
  const total = items.length;
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      const item = items[i];
      out[item.id] = await analyzeImageUrl(item.image || "");
      done += 1;
      options?.onProgress?.(done, total);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, () => worker()));
  return out;
}
