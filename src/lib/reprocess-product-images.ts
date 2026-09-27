import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
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
 * Trims near-white edges with Sharp, then centers the package on a square
 * so its longer side fills 88 % of the canvas. Returns null when the photo
 * is already tight. Encodes WebP once, at quality 95.
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
    const white = await base
      .clone()
      .trim({ background: "#ffffff", threshold: TRIM_THRESHOLD })
      .toBuffer({ resolveWithObject: true });
    trimmed = hasAlpha
      ? await sharp(white.data)
          .trim({ background: { r: 255, g: 255, b: 255, alpha: 0 }, threshold: TRIM_THRESHOLD })
          .toBuffer({ resolveWithObject: true })
      : white;
  } catch {
    return null;
  }

  const tw = trimmed.info.width;
  const th = trimmed.info.height;
  const removedW = beforeW - tw;
  const removedH = beforeH - th;
  if (removedW < beforeW * 0.04 && removedH < beforeH * 0.04) return null;

  const longest = Math.max(tw, th, 1);
  const size = Math.min(2000, Math.max(longest, Math.round(longest / PRODUCT_FILL)));
  const place = productFrame(tw, th, size);
  const resized = await sharp(trimmed.data)
    .resize(place.dw, place.dh, { fit: "fill", kernel: "lanczos3" })
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: hasAlpha
        ? { r: 0, g: 0, b: 0, alpha: 0 }
        : { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: resized, left: place.dx, top: place.dy }])
    .webp({ quality: 95, alphaQuality: 100 })
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

function orderedUrls(products: ProductRow[]): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const product of products) {
    const list = [product.image, ...urlList(product.images)].filter(
      (url): url is string => Boolean(url)
    );
    for (const url of list) {
      if (seen.has(url) || !storageObjectPath(url)) continue;
      seen.add(url);
      urls.push(url);
    }
  }
  return urls;
}

/** Dry-run: framed previews for a few photos. Nothing is uploaded or deleted. */
export async function previewProductFrames(
  supabase: SupabaseClient,
  limit = 5
): Promise<FramePreview[]> {
  const products = await productRows(supabase);
  const previews: FramePreview[] = [];
  for (const product of products) {
    if (previews.length >= limit) break;
    const url = product.image;
    if (!url || !storageObjectPath(url)) continue;
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const input = Buffer.from(await response.arrayBuffer());
      const framed = await frameProductWebp(input);
      if (!framed) continue;
      const before = await sharp(input).metadata();
      const after = await sharp(framed).metadata();
      previews.push({
        id: product.id,
        name: product.name_ar || product.name_de || product.id,
        beforeUrl: url,
        afterUrl: `data:image/webp;base64,${framed.toString("base64")}`,
        beforeSize: `${before.width ?? "?"}×${before.height ?? "?"}`,
        afterSize: `${after.width ?? "?"}×${after.height ?? "?"}`,
      });
    } catch {
      /* skip a photo that cannot be decoded */
    }
  }
  return previews;
}

/** Applies the trim to one page of images and reports progress. */
export async function applyProductFrameChunk(
  supabase: SupabaseClient,
  offset = 0,
  limit = 4
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
  const outcomes = await Promise.all(
    slice.map(async (url) => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Download ${response.status}`);
        const framed = await frameProductWebp(Buffer.from(await response.arrayBuffer()));
        if (!framed) return { url, status: "skipped" as const };
        const path = `products/${crypto.randomUUID()}.webp`;
        const uploaded = await supabase.storage.from(BUCKET).upload(path, framed, {
          contentType: "image/webp",
          upsert: false,
        });
        if (uploaded.error) throw new Error(uploaded.error.message);
        return {
          url,
          status: "reframed" as const,
          next: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl,
        };
      } catch (cause) {
        return {
          url,
          status: "failed" as const,
          message: cause instanceof Error ? cause.message : "Fehler",
        };
      }
    })
  );
  for (const outcome of outcomes) {
    if (outcome.status === "skipped") summary.skipped += 1;
    else if (outcome.status === "failed") {
      summary.failed += 1;
      summary.errors.push(`${outcome.url}: ${outcome.message}`);
    } else {
      replacements.set(outcome.url, outcome.next);
      summary.reframed += 1;
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
    const chunk = await applyProductFrameChunk(supabase, offset, 4);
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
