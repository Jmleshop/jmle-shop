import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MAX_EDGE_PRODUCT,
  STORAGE_WEBP_QUALITY_PCT,
} from "./image-bounds";
import { optimizeProductImageBuffer } from "./optimize-product-image";
import { PRODUCT_FILL, TRIM_THRESHOLD, productFrame } from "./image-editor/product-bounds";

const BUCKET = "product-images";
const MARKER = `/storage/v1/object/public/${BUCKET}/`;

export type ReframeSummary = {
  examined: number;
  reframed: number;
  skipped: number;
  failed: number;
  errors: string[];
};

type ProductRow = {
  id: string;
  name_ar?: string | null;
  name_de?: string | null;
  image: string | null;
  images: string[] | null;
};

export function storageObjectPath(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    const index = url.pathname.indexOf(MARKER);
    if (index === -1) return null;
    return decodeURIComponent(url.pathname.slice(index + MARKER.length));
  } catch {
    return null;
  }
}

function urlList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

/**
 * Legacy helper — trim + center only (no AI). Kept for frame-product-image API.
 */
export async function frameProductWebp(input: Buffer): Promise<Buffer | null> {
  const base = sharp(input, { failOn: "none" }).rotate();
  const meta = await base.metadata();
  const beforeW = meta.width ?? 0;
  const beforeH = meta.height ?? 0;
  if (!beforeW || !beforeH) return null;

  const hasAlpha = Boolean(meta.hasAlpha);
  let trimmed: { data: Buffer; info: { width: number; height: number } };
  try {
    if (hasAlpha) {
      // Freisteller: nur transparente Ränder — kein Weiß-Trim (würde Matte/Kästen erzeugen)
      trimmed = await base
        .clone()
        .ensureAlpha()
        .trim({
          background: { r: 0, g: 0, b: 0, alpha: 0 },
          threshold: TRIM_THRESHOLD,
        })
        .toBuffer({ resolveWithObject: true });
    } else {
      trimmed = await base
        .clone()
        .trim({ background: "#ffffff", threshold: TRIM_THRESHOLD })
        .toBuffer({ resolveWithObject: true });
    }
  } catch {
    return null;
  }

  const tw = trimmed.info.width;
  const th = trimmed.info.height;
  const removedW = beforeW - tw;
  const removedH = beforeH - th;
  if (removedW < beforeW * 0.04 && removedH < beforeH * 0.04) return null;

  const longest = Math.max(tw, th, 1);
  const size = Math.min(
    MAX_EDGE_PRODUCT,
    Math.max(longest, Math.round(longest / PRODUCT_FILL))
  );
  const place = productFrame(tw, th, size);
  const resized = await sharp(trimmed.data)
    .resize(place.dw, place.dh, { fit: "fill", kernel: "lanczos3" })
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: await sharp(resized).ensureAlpha().png().toBuffer(),
        left: place.dx,
        top: place.dy,
      },
    ])
    .webp({
      quality: STORAGE_WEBP_QUALITY_PCT,
      alphaQuality: 90,
      effort: 4,
      smartSubsample: true,
    })
    .toBuffer();
}

export type FramePreview = {
  id: string;
  name: string;
  beforeUrl: string;
  afterUrl: string;
  beforeSize: string;
  afterSize: string;
};

export type FrameChunk = ReframeSummary & {
  offset: number;
  nextOffset: number;
  total: number;
  done: boolean;
};

async function productRows(supabase: SupabaseClient): Promise<ProductRow[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, name_ar, name_de, image, images")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ProductRow[];
}

/** Alle Bild-URLs inkl. externer (Unsplash etc.) */
function orderedUrls(products: ProductRow[]): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const product of products) {
    const list = [product.image, ...urlList(product.images)].filter(
      (url): url is string => Boolean(url)
    );
    for (const url of list) {
      if (seen.has(url)) continue;
      if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) continue;
      seen.add(url);
      urls.push(url);
    }
  }
  return urls;
}

/** Dry-run: Freisteller+Zentrierung für ein paar Fotos. */
export async function previewProductFrames(
  supabase: SupabaseClient,
  limit = 5
): Promise<FramePreview[]> {
  const products = await productRows(supabase);
  const previews: FramePreview[] = [];
  for (const product of products) {
    if (previews.length >= limit) break;
    const url = product.image;
    if (!url) continue;
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const input = Buffer.from(await response.arrayBuffer());
      const optimized = await optimizeProductImageBuffer(input, {
        removeBackground: true,
        force: true,
      });
      const before = await sharp(input).metadata();
      previews.push({
        id: product.id,
        name: product.name_ar || product.name_de || product.id,
        beforeUrl: url,
        afterUrl: `data:${optimized.contentType};base64,${optimized.buffer.toString("base64")}`,
        beforeSize: `${before.width ?? "?"}×${before.height ?? "?"}`,
        afterSize: `${optimized.width}×${optimized.height}`,
      });
    } catch {
      /* skip */
    }
  }
  return previews;
}

/**
 * Verarbeitet einen Chunk aller Produktbilder:
 * AI-Freisteller + Trim + 1:1-Zentrierung (10 % Padding) → Storage → DB.
 * Funktioniert auch für externe URLs (Unsplash).
 */
export async function applyProductFrameChunk(
  supabase: SupabaseClient,
  offset = 0,
  limit = 2
): Promise<FrameChunk> {
  const products = await productRows(supabase);
  const urls = orderedUrls(products);
  const slice = urls.slice(offset, offset + limit);
  const summary: FrameChunk = {
    examined: slice.length,
    reframed: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    offset,
    nextOffset: Math.min(urls.length, offset + slice.length),
    total: urls.length,
    done: offset + slice.length >= urls.length,
  };
  const replacements = new Map<string, string>();

  // Sequentiell: ONNX-Modell teilt sich den RAM
  for (const url of slice) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "jmle-image-optimizer/1.0" },
      });
      if (!response.ok) throw new Error(`Download ${response.status}`);
      const input = Buffer.from(await response.arrayBuffer());
      const optimized = await optimizeProductImageBuffer(input, {
        removeBackground: true,
        force: true,
      });
      const path = `products/${crypto.randomUUID()}.webp`;
      const uploaded = await supabase.storage.from(BUCKET).upload(path, optimized.buffer, {
        contentType: "image/webp",
        upsert: false,
      });
      if (uploaded.error) throw new Error(uploaded.error.message);
      const next = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      replacements.set(url, next);
      summary.reframed += 1;
    } catch (cause) {
      summary.failed += 1;
      summary.errors.push(
        `${url}: ${cause instanceof Error ? cause.message : "Fehler"}`
      );
    }
  }

  let databaseFailed = false;
  if (replacements.size) {
    for (const product of products) {
      const image = product.image ? replacements.get(product.image) ?? product.image : product.image;
      const images = urlList(product.images).map((url) => replacements.get(url) ?? url);
      const imageChanged = image !== product.image;
      const listChanged = images.some((url, index) => url !== urlList(product.images)[index]);
      if (!imageChanged && !listChanged) continue;
      const updated = await supabase.from("products").update({ image, images }).eq("id", product.id);
      if (updated.error) {
        databaseFailed = true;
        summary.failed += 1;
        summary.errors.push(`${product.id}: ${updated.error.message}`);
      }
    }
  }

  // Alte Storage-Objekte löschen (externe URLs haben keinen Storage-Pfad)
  if (!databaseFailed && replacements.size > 0) {
    const stale = [...replacements.keys()]
      .map((url) => storageObjectPath(url))
      .filter((path): path is string => Boolean(path));
    if (stale.length) await supabase.storage.from(BUCKET).remove(stale);
  }

  return summary;
}

export async function reprocessAllProductImages(
  supabase: SupabaseClient
): Promise<ReframeSummary> {
  const summary: ReframeSummary = {
    examined: 0,
    reframed: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };
  let offset = 0;
  let guard = 0;
  while (guard < 5000) {
    const chunk = await applyProductFrameChunk(supabase, offset, 2);
    summary.examined += chunk.examined;
    summary.reframed += chunk.reframed;
    summary.skipped += chunk.skipped;
    summary.failed += chunk.failed;
    summary.errors.push(...chunk.errors);
    if (chunk.done || chunk.examined === 0) break;
    offset = chunk.nextOffset;
    guard += 1;
  }
  return summary;
}
