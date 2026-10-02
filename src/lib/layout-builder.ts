/**
 * Visual Page-Builder: Draft / Published / Versions.
 * Gespeichert in site_settings (kein hartes Schema nötig).
 */

export type LayoutViewport = "desktop" | "tablet" | "mobile";

export type CartPosition = "start" | "end";

export type BannerObjectFit = "contain" | "cover";

export interface LayoutSliderStyle {
  /** Mindesthöhe in px (0 = nur Seitenverhältnis) */
  heightPx: number;
  /** Vertikaler Außenabstand in px */
  marginY: number;
  /** Vertikale Verschiebung in px */
  offsetY: number;
  objectFit: BannerObjectFit;
  /** z. B. "center center", "50% 30%" */
  objectPosition: string;
}

export interface LayoutChrome {
  /** Logo-Skalierung relativ zur Default-Größe (0.5–2.5) */
  logoScale: number;
  headerBg: string;
  navbarBg: string;
  pageBg: string;
  /** Warenkorb: start = Anfang der Icon-Gruppe, end = Ende (rechts im LTR / Ende im Flex) */
  cartPosition: CartPosition;
}

export interface LayoutDocument {
  version: 1;
  updatedAt: string;
  chrome: LayoutChrome;
  slider: Record<LayoutViewport, LayoutSliderStyle>;
}

export interface LayoutVersionEntry {
  id: string;
  label: string;
  publishedAt: string;
  document: LayoutDocument;
}

export const LAYOUT_SETTING_KEYS = {
  draft: "layout_draft",
  published: "layout_published",
  versions: "layout_versions",
} as const;

export const LAYOUT_PREVIEW_MESSAGE = "jmle:layout-preview" as const;
export const LAYOUT_PREVIEW_READY = "jmle:layout-preview-ready" as const;

export const MAX_LAYOUT_VERSIONS = 20;

const DEFAULT_SLIDER: LayoutSliderStyle = {
  heightPx: 0,
  marginY: 0,
  offsetY: 0,
  objectFit: "contain",
  objectPosition: "center center",
};

export function defaultLayoutDocument(): LayoutDocument {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    chrome: {
      logoScale: 1,
      headerBg: "",
      navbarBg: "",
      pageBg: "",
      cartPosition: "end",
    },
    slider: {
      desktop: { ...DEFAULT_SLIDER },
      tablet: { ...DEFAULT_SLIDER },
      mobile: { ...DEFAULT_SLIDER },
    },
  };
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function asString(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}

function asFit(v: unknown): BannerObjectFit {
  return v === "cover" ? "cover" : "contain";
}

function asCart(v: unknown): CartPosition {
  return v === "start" ? "start" : "end";
}

function normalizeSlider(raw: unknown): LayoutSliderStyle {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    heightPx: clamp(Number(o.heightPx ?? 0), 0, 1200),
    marginY: clamp(Number(o.marginY ?? 0), -80, 160),
    offsetY: clamp(Number(o.offsetY ?? 0), -200, 200),
    objectFit: asFit(o.objectFit),
    objectPosition: asString(o.objectPosition, "center center").slice(0, 64) || "center center",
  };
}

/** Unbekannte / partielle Payloads in ein gültiges LayoutDocument normalisieren. */
export function normalizeLayoutDocument(raw: unknown): LayoutDocument {
  const base = defaultLayoutDocument();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const chromeRaw =
    o.chrome && typeof o.chrome === "object"
      ? (o.chrome as Record<string, unknown>)
      : {};
  const sliderRaw =
    o.slider && typeof o.slider === "object"
      ? (o.slider as Record<string, unknown>)
      : {};

  return {
    version: 1,
    updatedAt: asString(o.updatedAt, base.updatedAt) || base.updatedAt,
    chrome: {
      logoScale: clamp(Number(chromeRaw.logoScale ?? base.chrome.logoScale), 0.5, 2.5),
      headerBg: asString(chromeRaw.headerBg, "").slice(0, 64),
      navbarBg: asString(chromeRaw.navbarBg, "").slice(0, 64),
      pageBg: asString(chromeRaw.pageBg, "").slice(0, 64),
      cartPosition: asCart(chromeRaw.cartPosition),
    },
    slider: {
      desktop: normalizeSlider(sliderRaw.desktop ?? base.slider.desktop),
      tablet: normalizeSlider(sliderRaw.tablet ?? base.slider.tablet),
      mobile: normalizeSlider(sliderRaw.mobile ?? base.slider.mobile),
    },
  };
}

export function normalizeLayoutVersions(raw: unknown): LayoutVersionEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: LayoutVersionEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = asString(o.id, "");
    if (!id) continue;
    out.push({
      id,
      label: asString(o.label, "Release").slice(0, 120),
      publishedAt: asString(o.publishedAt, new Date().toISOString()),
      document: normalizeLayoutDocument(o.document),
    });
  }
  return out.slice(0, MAX_LAYOUT_VERSIONS);
}

export function documentsEqual(a: LayoutDocument, b: LayoutDocument): boolean {
  return JSON.stringify(stripUpdatedAt(a)) === JSON.stringify(stripUpdatedAt(b));
}

function stripUpdatedAt(doc: LayoutDocument): Omit<LayoutDocument, "updatedAt"> {
  const { updatedAt: _u, ...rest } = doc;
  void _u;
  return rest;
}

export function layoutCssVars(
  doc: LayoutDocument,
  viewport: LayoutViewport = "desktop"
): Record<string, string> {
  const chrome = doc.chrome;
  const slider = doc.slider[viewport] ?? doc.slider.desktop;
  const vars: Record<string, string> = {
    "--layout-logo-scale": String(chrome.logoScale),
    "--layout-banner-min-height": slider.heightPx > 0 ? `${slider.heightPx}px` : "0px",
    "--layout-banner-margin-y": `${slider.marginY}px`,
    "--layout-banner-offset-y": `${slider.offsetY}px`,
    "--layout-banner-object-fit": slider.objectFit,
    "--layout-banner-object-position": slider.objectPosition,
  };
  // Nur setzen wenn gewählt — sonst bleibt Tailwind-Default (jmle-cream).
  if (chrome.headerBg) vars["--layout-header-bg"] = chrome.headerBg;
  if (chrome.navbarBg) vars["--layout-navbar-bg"] = chrome.navbarBg;
  if (chrome.pageBg) vars["--layout-page-bg"] = chrome.pageBg;
  return vars;
}

export function detectViewportWidth(width: number): LayoutViewport {
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

export const VIEWPORT_WIDTHS: Record<LayoutViewport, number> = {
  mobile: 390,
  tablet: 768,
  desktop: 1280,
};
