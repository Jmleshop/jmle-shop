import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { STORAGE_WEBP_QUALITY_PCT } from "@/lib/image-bounds";
import { readSiteLogo } from "@/lib/site-logo";

export type WatermarkPosition =
  | "bottom-right"
  | "bottom-left"
  | "center"
  | "tile";

export type ProductWatermarkSettings = {
  enabled: boolean;
  /** Optional eigenes Wasserzeichen-Logo; sonst Shop-Logo */
  logoUrl: string;
  opacity: number;
  /** Anteil der Bildbreite (0.08–0.4) */
  scale: number;
  position: WatermarkPosition;
};

export const DEFAULT_PRODUCT_WATERMARK: ProductWatermarkSettings = {
  enabled: false,
  logoUrl: "",
  opacity: 0.38,
  scale: 0.22,
  position: "bottom-right",
};

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function asPosition(v: unknown): WatermarkPosition {
  if (
    v === "bottom-left" ||
    v === "center" ||
    v === "tile" ||
    v === "bottom-right"
  ) {
    return v;
  }
  return "bottom-right";
}

/** Liest Wasserzeichen-Einstellungen aus site_settings (key=site). */
export function parseProductWatermarkSettings(
  siteValue: Record<string, unknown> | null | undefined,
  fallbackLogo = ""
): ProductWatermarkSettings {
  const raw = (siteValue ?? {}) as Record<string, unknown>;
  const logo =
    (typeof raw.productWatermarkLogo === "string"
      ? raw.productWatermarkLogo.trim()
      : "") ||
    fallbackLogo.trim() ||
    "";
  return {
    enabled: Boolean(raw.productWatermarkEnabled),
    logoUrl: logo,
    opacity: clamp(Number(raw.productWatermarkOpacity ?? 0.38), 0.1, 0.85),
    scale: clamp(Number(raw.productWatermarkScale ?? 0.22), 0.08, 0.4),
    position: asPosition(raw.productWatermarkPosition),
  };
}

export async function loadProductWatermarkSettings(
  supabase: SupabaseClient
): Promise<ProductWatermarkSettings> {
  const [{ data }, logo] = await Promise.all([
    supabase.from("site_settings").select("value").eq("key", "site").maybeSingle(),
    readSiteLogo(supabase),
  ]);
  const value = (data?.value as Record<string, unknown> | null) ?? {};
  return parseProductWatermarkSettings(value, logo || "");
}

async function fetchLogoBuffer(url: string): Promise<Buffer | null> {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const res = await fetch(trimmed, {
      headers: { "User-Agent": "jmle-watermark/1.0" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length ? buf : null;
  } catch {
    return null;
  }
}

/** Text-Wasserzeichen als SVG, falls kein Logo vorhanden. */
function textWatermarkSvg(label: string, width: number, opacity: number): Buffer {
  const fontSize = Math.max(14, Math.round(width * 0.045));
  const safe = label.replace(/[<>&"]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${Math.round(
    fontSize * 1.6
  )}">
  <text x="100%" y="70%" text-anchor="end" font-family="Georgia, serif" font-size="${fontSize}"
    fill="rgba(31,41,55,${opacity})">${safe}</text>
</svg>`;
  return Buffer.from(svg);
}

async function buildLogoOverlay(
  logo: Buffer,
  baseWidth: number,
  baseHeight: number,
  settings: ProductWatermarkSettings
): Promise<{ input: Buffer; left?: number; top?: number; tile?: boolean }> {
  const targetW = Math.max(24, Math.round(baseWidth * settings.scale));
  const resized = await sharp(logo)
    .rotate()
    .ensureAlpha()
    .resize({
      width: targetW,
      fit: "inside",
      withoutEnlargement: false,
      kernel: "lanczos3",
    })
    .png()
    .toBuffer({ resolveWithObject: true });

  // Opacity über Alpha multiplizieren
  const { data, info } = await sharp(resized.data)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = Buffer.from(data);
  const factor = settings.opacity;
  for (let i = 3; i < pixels.length; i += 4) {
    pixels[i] = Math.round(pixels[i] * factor);
  }
  const faded = await sharp(pixels, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();

  if (settings.position === "tile") {
    return { input: faded, tile: true };
  }

  const pad = Math.max(8, Math.round(Math.min(baseWidth, baseHeight) * 0.04));
  if (settings.position === "center") {
    return {
      input: faded,
      left: Math.max(0, Math.round((baseWidth - info.width) / 2)),
      top: Math.max(0, Math.round((baseHeight - info.height) / 2)),
    };
  }
  if (settings.position === "bottom-left") {
    return {
      input: faded,
      left: pad,
      top: Math.max(0, baseHeight - info.height - pad),
    };
  }
  return {
    input: faded,
    left: Math.max(0, baseWidth - info.width - pad),
    top: Math.max(0, baseHeight - info.height - pad),
  };
}

/**
 * Brennt ein halbtransparentes Logo (oder Text-Fallback) in das Produktbild.
 * Ergebnis: WebP mit Alpha.
 */
export async function applyProductWatermark(
  input: Buffer,
  settings: ProductWatermarkSettings,
  options?: { shopName?: string }
): Promise<{ buffer: Buffer; applied: boolean; reason?: string }> {
  if (!settings.enabled) {
    return { buffer: input, applied: false, reason: "disabled" };
  }

  const base = sharp(input, { failOn: "none" }).rotate().ensureAlpha();
  const meta = await base.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) {
    return { buffer: input, applied: false, reason: "invalid-image" };
  }

  const logoBuf = settings.logoUrl
    ? await fetchLogoBuffer(settings.logoUrl)
    : null;

  type Overlay = {
    input: Buffer;
    left?: number;
    top?: number;
    tile?: boolean;
    blend?: "over";
  };
  let composite: Overlay[];
  if (logoBuf) {
    const overlay = await buildLogoOverlay(logoBuf, width, height, settings);
    composite = [
      overlay.tile
        ? { input: overlay.input, tile: true, blend: "over" }
        : {
            input: overlay.input,
            left: overlay.left,
            top: overlay.top,
            blend: "over",
          },
    ];
  } else {
    const label = (options?.shopName || "jmle").slice(0, 32);
    const svg = textWatermarkSvg(label, width, settings.opacity);
    const pad = Math.max(8, Math.round(Math.min(width, height) * 0.04));
    const svgMeta = await sharp(svg).metadata();
    const sh = svgMeta.height ?? 24;
    composite = [
      {
        input: svg,
        left: 0,
        top: Math.max(0, height - sh - pad),
        blend: "over",
      },
    ];
  }

  const buffer = await base
    .composite(composite)
    .webp({
      quality: STORAGE_WEBP_QUALITY_PCT,
      alphaQuality: 90,
      effort: 4,
      smartSubsample: true,
    })
    .toBuffer();

  return { buffer, applied: true };
}
