import type { SupabaseClient } from "@supabase/supabase-js";
import {
  applyProductWatermark,
  loadProductWatermarkSettings,
} from "@/lib/product-watermark";
import { storageObjectPath } from "@/lib/reprocess-product-images";

const BUCKET = "product-images";

type ProductRow = {
  id: string;
  image: string | null;
  images: string[] | null;
};

export type WatermarkChunk = {
  examined: number;
  watermarked: number;
  skipped: number;
  failed: number;
  errors: string[];
  offset: number;
  nextOffset: number;
  total: number;
  done: boolean;
  enabled: boolean;
};

function urlList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

async function productRows(supabase: SupabaseClient): Promise<ProductRow[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, image, images")
    .is("deleted_at", null)
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
      if (seen.has(url)) continue;
      if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) continue;
      seen.add(url);
      urls.push(url);
    }
  }
  return urls;
}

/**
 * Chunk-weise Wasserzeichen auf bestehende Produktbilder anwenden.
 * Speichert neue WebPs und aktualisiert products.image / images.
 */
export async function applyWatermarkChunk(
  supabase: SupabaseClient,
  offset = 0,
  limit = 3
): Promise<WatermarkChunk> {
  const settings = await loadProductWatermarkSettings(supabase);
  const products = await productRows(supabase);
  const urls = orderedUrls(products);
  const slice = urls.slice(offset, offset + limit);

  const summary: WatermarkChunk = {
    examined: slice.length,
    watermarked: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    offset,
    nextOffset: Math.min(urls.length, offset + slice.length),
    total: urls.length,
    done: offset + slice.length >= urls.length,
    enabled: settings.enabled,
  };

  if (!settings.enabled) {
    summary.skipped = slice.length;
    return summary;
  }

  const replacements = new Map<string, string>();

  for (const url of slice) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "jmle-watermark/1.0" },
      });
      if (!response.ok) throw new Error(`Download ${response.status}`);
      const input = Buffer.from(await response.arrayBuffer());
      const result = await applyProductWatermark(input, settings, {
        shopName: "jmle",
      });
      if (!result.applied) {
        summary.skipped += 1;
        continue;
      }
      const path = `products/${crypto.randomUUID()}.webp`;
      const uploaded = await supabase.storage.from(BUCKET).upload(path, result.buffer, {
        contentType: "image/webp",
        upsert: false,
        cacheControl: "31536000",
      });
      if (uploaded.error) throw new Error(uploaded.error.message);
      const next = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      replacements.set(url, next);
      summary.watermarked += 1;
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
      const image = product.image
        ? replacements.get(product.image) ?? product.image
        : product.image;
      const images = urlList(product.images).map(
        (url) => replacements.get(url) ?? url
      );
      const imageChanged = image !== product.image;
      const listChanged = images.some(
        (url, index) => url !== urlList(product.images)[index]
      );
      if (!imageChanged && !listChanged) continue;
      const updated = await supabase
        .from("products")
        .update({ image, images })
        .eq("id", product.id);
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
