/**
 * Visual Page-Builder: Draft / Published / Versions.
 * Gespeichert in site_settings (kein hartes Schema nötig).
 *
 * v1 → v2: header / brands / typography / sectionTitles ergänzt.
 */

export type LayoutViewport = "desktop" | "tablet" | "mobile";

export type CartPosition = "start" | "end";

export type BannerObjectFit = "contain" | "cover";

export type SectionTitleAlign = "start" | "center" | "end";

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

/** Gesamte Kopfleiste (Höhe/Padding/Skalierung) */
export interface LayoutHeaderStyle {
  /** Zusätzliche Skalierung der gesamten Header-Chrome (0.7–1.4) */
  scale: number;
  /** 0 = auto aus Inhalt */
  heightPx: number;
  paddingY: number;
  gap: number;
}

/** Marken-Ticker */
export interface LayoutBrandsStyle {
  logoScale: number;
  gap: number;
  paddingY: number;
  /** Marquee-Geschwindigkeitsfaktor (0.4–2.5) */
  speed: number;
}

/** Globale Farben & Typografie */
export interface LayoutTypography {
  headingColor: string;
  bodyColor: string;
  accentColor: string;
  headingScale: number;
  sectionTitleAlign: SectionTitleAlign;
}

export interface LayoutSectionTitle {
  ar?: string;
  de?: string;
}

export interface LayoutDocument {
  version: 2;
  updatedAt: string;
  chrome: LayoutChrome;
  slider: Record<LayoutViewport, LayoutSliderStyle>;
  header: LayoutHeaderStyle;
  brands: LayoutBrandsStyle;
  typography: LayoutTypography;
  /** Inline-Titel-Overrides pro Homepage-Sektion */
  sectionTitles: Record<string, LayoutSectionTitle>;
}

export interface LayoutVersionEntry {
  id: string;
  label: string;
  publishedAt: string;
  document: LayoutDocument;
  /** Optionaler Content-Snapshot (Sektionen + Slide-Order) ab v2 */
  content?: BuilderContentDraft | null;
}

/** Draft-Overlay für Sektions-/Slide-Reihenfolge */
export interface BuilderContentDraft {
  homepageSections: unknown[];
  slideOrders: Record<string, string[]>;
  updatedAt: string;
}

export const LAYOUT_SETTING_KEYS = {
  draft: "layout_draft",
  published: "layout_published",
  versions: "layout_versions",
  contentDraft: "builder_content_draft",
} as const;

export const LAYOUT_PREVIEW_MESSAGE = "jmle:layout-preview" as const;
export const LAYOUT_PREVIEW_READY = "jmle:layout-preview-ready" as const;
/** Parent → iframe: bitte READY erneut senden */
export const LAYOUT_PREVIEW_PING = "jmle:layout-preview-ping" as const;
/** Parent → iframe: Sektions-/Slide-Reihenfolge */
export const LAYOUT_PREVIEW_STRUCTURE = "jmle:layout-preview-structure" as const;
/** iframe → Parent: Inline-Titel-Edit */
export const LAYOUT_PREVIEW_EDIT = "jmle:layout-preview-edit" as const;

export const MAX_LAYOUT_VERSIONS = 20;

const DEFAULT_SLIDER: LayoutSliderStyle = {
  heightPx: 0,
  marginY: 0,
  offsetY: 0,
  objectFit: "contain",
  objectPosition: "center center",
};

const DEFAULT_HEADER: LayoutHeaderStyle = {
  scale: 1,
  heightPx: 0,
  paddingY: 8,
  gap: 8,
};

const DEFAULT_BRANDS: LayoutBrandsStyle = {
  logoScale: 1,
  gap: 8,
  paddingY: 8,
  speed: 1,
};

const DEFAULT_TYPOGRAPHY: LayoutTypography = {
  headingColor: "",
  bodyColor: "",
  accentColor: "",
  headingScale: 1,
  sectionTitleAlign: "center",
};

export function defaultLayoutDocument(): LayoutDocument {
  return {
    version: 2,
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
    header: { ...DEFAULT_HEADER },
    brands: { ...DEFAULT_BRANDS },
    typography: { ...DEFAULT_TYPOGRAPHY },
    sectionTitles: {},
  };
}

export function defaultBuilderContentDraft(): BuilderContentDraft {
  return {
    homepageSections: [],
    slideOrders: {},
    updatedAt: new Date().toISOString(),
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

function asAlign(v: unknown): SectionTitleAlign {
  if (v === "start" || v === "end") return v;
  return "center";
}

function normalizeSlider(raw: unknown): LayoutSliderStyle {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    heightPx: clamp(Number(o.heightPx ?? 0), 0, 1200),
    marginY: clamp(Number(o.marginY ?? 0), -80, 160),
    offsetY: clamp(Number(o.offsetY ?? 0), -200, 200),
    objectFit: asFit(o.objectFit),
    objectPosition:
      asString(o.objectPosition, "center center").slice(0, 64) || "center center",
  };
}

function normalizeHeader(raw: unknown): LayoutHeaderStyle {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    scale: clamp(Number(o.scale ?? DEFAULT_HEADER.scale), 0.7, 1.4),
    heightPx: clamp(Number(o.heightPx ?? 0), 0, 200),
    paddingY: clamp(Number(o.paddingY ?? DEFAULT_HEADER.paddingY), 0, 48),
    gap: clamp(Number(o.gap ?? DEFAULT_HEADER.gap), 0, 32),
  };
}

function normalizeBrands(raw: unknown): LayoutBrandsStyle {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    logoScale: clamp(Number(o.logoScale ?? DEFAULT_BRANDS.logoScale), 0.5, 2),
    gap: clamp(Number(o.gap ?? DEFAULT_BRANDS.gap), 0, 48),
    paddingY: clamp(Number(o.paddingY ?? DEFAULT_BRANDS.paddingY), 0, 48),
    speed: clamp(Number(o.speed ?? DEFAULT_BRANDS.speed), 0.4, 2.5),
  };
}

function normalizeTypography(raw: unknown): LayoutTypography {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    headingColor: asString(o.headingColor, "").slice(0, 64),
    bodyColor: asString(o.bodyColor, "").slice(0, 64),
    accentColor: asString(o.accentColor, "").slice(0, 64),
    headingScale: clamp(Number(o.headingScale ?? 1), 0.7, 1.6),
    sectionTitleAlign: asAlign(o.sectionTitleAlign),
  };
}

function normalizeSectionTitles(raw: unknown): Record<string, LayoutSectionTitle> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, LayoutSectionTitle> = {};
  for (const [id, val] of Object.entries(raw as Record<string, unknown>)) {
    const key = id.trim().slice(0, 80);
    if (!key) continue;
    if (typeof val === "string") {
      out[key] = { ar: val.slice(0, 200) };
      continue;
    }
    if (!val || typeof val !== "object") continue;
    const o = val as Record<string, unknown>;
    const ar = asString(o.ar, "").slice(0, 200);
    const de = asString(o.de, "").slice(0, 200);
    if (!ar && !de) continue;
    out[key] = {
      ...(ar ? { ar } : {}),
      ...(de ? { de } : {}),
    };
  }
  return out;
}

/** Unbekannte / partielle Payloads in ein gültiges LayoutDocument normalisieren (v1→v2). */
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
    version: 2,
    updatedAt: asString(o.updatedAt, base.updatedAt) || base.updatedAt,
    chrome: {
      logoScale: clamp(
        Number(chromeRaw.logoScale ?? base.chrome.logoScale),
        0.5,
        2.5
      ),
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
    header: normalizeHeader(o.header),
    brands: normalizeBrands(o.brands),
    typography: normalizeTypography(o.typography),
    sectionTitles: normalizeSectionTitles(o.sectionTitles),
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
      content: o.content != null ? normalizeBuilderContentDraft(o.content) : null,
    });
  }
  return out.slice(0, MAX_LAYOUT_VERSIONS);
}

export function normalizeBuilderContentDraft(raw: unknown): BuilderContentDraft {
  const base = defaultBuilderContentDraft();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const sections = Array.isArray(o.homepageSections) ? o.homepageSections : [];
  const ordersRaw =
    o.slideOrders && typeof o.slideOrders === "object"
      ? (o.slideOrders as Record<string, unknown>)
      : {};
  const slideOrders: Record<string, string[]> = {};
  for (const [zone, ids] of Object.entries(ordersRaw)) {
    if (!Array.isArray(ids)) continue;
    const clean = ids
      .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      .map((id) => id.trim().slice(0, 80))
      .slice(0, 100);
    if (clean.length) slideOrders[zone.slice(0, 80)] = clean;
  }
  return {
    homepageSections: sections.slice(0, 40),
    slideOrders,
    updatedAt: asString(o.updatedAt, base.updatedAt) || base.updatedAt,
  };
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
  const header = doc.header;
  const brands = doc.brands;
  const typo = doc.typography;
  const hasFixedHeight = slider.heightPx > 0;
  const vars: Record<string, string> = {
    "--layout-logo-scale": String(chrome.logoScale * header.scale),
    "--layout-header-scale": String(header.scale),
    "--layout-header-pad-y": `${header.paddingY}px`,
    "--layout-header-gap": `${header.gap}px`,
    "--layout-header-min-height":
      header.heightPx > 0 ? `${header.heightPx}px` : "0px",
    "--layout-brands-logo-scale": String(brands.logoScale),
    "--layout-brands-gap": `${brands.gap}px`,
    "--layout-brands-pad-y": `${brands.paddingY}px`,
    "--layout-brands-speed": String(brands.speed),
    "--layout-heading-scale": String(typo.headingScale),
    "--layout-title-align": typo.sectionTitleAlign,
    // Feste Höhe ersetzt Aspect-Ratio; 0 = auto über aspect 2.4/1
    "--layout-banner-height": hasFixedHeight ? `${slider.heightPx}px` : "auto",
    "--layout-banner-min-height": hasFixedHeight ? `${slider.heightPx}px` : "0px",
    "--layout-banner-aspect": hasFixedHeight ? "auto" : "2.4 / 1",
    "--layout-banner-margin-y": `${slider.marginY}px`,
    "--layout-banner-offset-y": `${slider.offsetY}px`,
    "--layout-banner-object-fit": slider.objectFit,
    "--layout-banner-object-position": slider.objectPosition,
  };
  if (chrome.headerBg) vars["--layout-header-bg"] = chrome.headerBg;
  if (chrome.navbarBg) vars["--layout-navbar-bg"] = chrome.navbarBg;
  if (chrome.pageBg) vars["--layout-page-bg"] = chrome.pageBg;
  if (typo.headingColor) vars["--layout-heading-color"] = typo.headingColor;
  if (typo.bodyColor) vars["--layout-body-color"] = typo.bodyColor;
  if (typo.accentColor) vars["--layout-accent"] = typo.accentColor;
  return vars;
}

/** Banner-Vars für einen Viewport (für Media-Query-Blöcke). */
export function layoutBannerCssVars(
  doc: LayoutDocument,
  viewport: LayoutViewport
): Record<string, string> {
  const slider = doc.slider[viewport] ?? doc.slider.desktop;
  const hasFixedHeight = slider.heightPx > 0;
  return {
    "--layout-banner-height": hasFixedHeight ? `${slider.heightPx}px` : "auto",
    "--layout-banner-min-height": hasFixedHeight ? `${slider.heightPx}px` : "0px",
    "--layout-banner-aspect": hasFixedHeight ? "auto" : "2.4 / 1",
    "--layout-banner-margin-y": `${slider.marginY}px`,
    "--layout-banner-offset-y": `${slider.offsetY}px`,
    "--layout-banner-object-fit": slider.objectFit,
    "--layout-banner-object-position": slider.objectPosition,
  };
}

function cssDecls(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

/**
 * Live-Shop CSS: Desktop als Default, Tablet/Mobile per Media Query.
 * Ein Banner-Bild skaliert über object-fit auf allen Viewports.
 */
export function layoutCssVarsResponsive(doc: LayoutDocument): string {
  const root = layoutCssVars(doc, "desktop");
  const tablet = layoutBannerCssVars(doc, "tablet");
  const mobile = layoutBannerCssVars(doc, "mobile");
  const cart = `html{--layout-cart:${doc.chrome.cartPosition}}`;
  return [
    `:root{${cssDecls(root)}}`,
    cart,
    `@media (max-width:1023px){:root{${cssDecls(tablet)}}}`,
    `@media (max-width:767px){:root{${cssDecls(mobile)}}}`,
  ].join("");
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
