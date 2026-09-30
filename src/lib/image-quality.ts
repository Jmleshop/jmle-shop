/**
 * Bildqualitäts-Analyse für Admin-Produktliste.
 * Konservativ: nur echte Mängel (fehlend, korrupt, extrem niedrige Auflösung).
 * Keine Heuristik für Blur/Freisteller — die erzeugte zu viele False Positives.
 */

export type ImageQualityIssue =
  | "low_res"
  | "blurry"
  | "bad_cutout"
  | "missing"
  | "corrupt";

export type ImageQualityResult = {
  ok: boolean;
  score: number; // 0–100, höher = besser
  issues: ImageQualityIssue[];
  width: number;
  height: number;
  labelDe: string;
  labelAr: string;
};

/** Nur extrem kleine Kanten gelten als mangelhaft (User: < 150px). */
export const IMAGE_QUALITY_MIN_EDGE = 150;

const ISSUE_COPY: Record<ImageQualityIssue, { de: string; ar: string }> = {
  missing: { de: "Kein Bild", ar: "لا صورة" },
  corrupt: { de: "Bilddatei beschädigt", ar: "ملف صورة تالف" },
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

function scoreFor(issues: ImageQualityIssue[]): number {
  let score = 100;
  if (issues.includes("missing") || issues.includes("corrupt")) score -= 100;
  if (issues.includes("low_res")) score -= 40;
  return Math.max(0, Math.min(100, score));
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

export function corruptImageQuality(): ImageQualityResult {
  return withLabels({
    ok: false,
    score: 0,
    issues: ["corrupt"],
    width: 0,
    height: 0,
  });
}

/** Unbekannt / nicht prüfbar (z. B. CORS) → nicht rot markieren. */
export function unknownOkQuality(
  width = 0,
  height = 0
): ImageQualityResult {
  return withLabels({
    ok: true,
    score: 80,
    issues: [],
    width,
    height,
  });
}

/**
 * Rohpixel-Analyse (Unit-Tests / erweiterte Checks).
 * Aktuell nur Auflösung — Blur/Cutout-Heuristiken sind deaktiviert.
 */
export function analyzeRawPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number
): ImageQualityResult {
  void data;
  const issues: ImageQualityIssue[] = [];
  if (Math.min(width, height) < IMAGE_QUALITY_MIN_EDGE) {
    issues.push("low_res");
  }
  return withLabels({
    ok: issues.length === 0,
    score: scoreFor(issues),
    issues,
    width,
    height,
  });
}

/** Analysiert ein geladenes ImageBitmap (wird nicht geschlossen). */
export function analyzeImageBitmap(bitmap: ImageBitmap): ImageQualityResult {
  const width = bitmap.width;
  const height = bitmap.height;
  if (width < 1 || height < 1) return corruptImageQuality();
  const issues: ImageQualityIssue[] = [];
  if (Math.min(width, height) < IMAGE_QUALITY_MIN_EDGE) {
    issues.push("low_res");
  }
  return withLabels({
    ok: issues.length === 0,
    score: scoreFor(issues),
    issues,
    width,
    height,
  });
}

/** Lädt Bild-URL und bewertet Qualität — nur echte Mängel. */
export async function analyzeImageUrl(url: string): Promise<ImageQualityResult> {
  if (!url?.trim()) return missingImageQuality();
  try {
    const res = await fetch(url, {
      mode: "cors",
      credentials: "omit",
      cache: "force-cache",
    });
    if (!res.ok) {
      // Netz/403: nicht pauschal als Fehler markieren
      return unknownOkQuality();
    }
    const blob = await res.blob();
    if (!blob.size) return corruptImageQuality();
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(blob);
    } catch {
      return corruptImageQuality();
    }
    try {
      return analyzeImageBitmap(bitmap);
    } finally {
      bitmap.close();
    }
  } catch {
    // CORS/Netzwerk — unbekannt, nicht rot markieren
    return unknownOkQuality();
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

  await Promise.all(
    Array.from({ length: Math.min(concurrency, Math.max(1, total)) }, () =>
      worker()
    )
  );
  return out;
}
