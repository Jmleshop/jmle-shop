import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { squarePlacement } from "./image-editor/geometry";
import {
  PRODUCT_FILL,
  frameSquareSize,
  productPixelBounds,
  shouldReframe,
} from "./image-editor/product-bounds";

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

/** Crops near-white margins and centers the product at 88 % of a square. */
export async function frameProductWebp(input: Buffer): Promise<Buffer | null> {
  const base = sharp(input, { failOn: "none" }).rotate();
  const { data, info } = await base
    .clone()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const box = productPixelBounds(data, info.width, info.height, info.channels);
  if (!box || !shouldReframe(box, info.width, info.height)) {
    return null;
  }

  const size = frameSquareSize(box.w, box.h);
  const inner = Math.max(1, Math.round(size * PRODUCT_FILL));
  const origin = Math.round((size - inner) / 2);
  const place = squarePlacement(box.w, box.h, inner);
  const extracted = await sharp(input, { failOn: "none" })
    .rotate()
    .extract({ left: box.x, top: box.y, width: box.w, height: box.h })
    .resize(place.dw, place.dh, { fit: "fill", kernel: "lanczos3" })
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: "#ffffff",
    },
  })
    .composite([
      {
        input: extracted,
        left: place.dx + origin,
        top: place.dy + origin,
      },
    ])
    .webp({ quality: 95 })
    .toBuffer();
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

  const { data, error } = await supabase.from("products").select("id, image, images");
  if (error) throw new Error(error.message);
  const products = (data ?? []) as ProductRow[];

  const urls = new Set<string>();
  for (const product of products) {
    if (product.image) urls.add(product.image);
    for (const url of urlList(product.images)) urls.add(url);
  }

  const replacements = new Map<string, string>();
  for (const url of urls) {
    summary.examined += 1;
    const sourcePath = storageObjectPath(url);
    if (!sourcePath) {
      summary.skipped += 1;
      continue;
    }
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Download ${response.status}`);
      const framed = await frameProductWebp(Buffer.from(await response.arrayBuffer()));
      if (!framed) {
        summary.skipped += 1;
        continue;
      }
      const path = `products/${crypto.randomUUID()}.webp`;
      const uploaded = await supabase.storage.from(BUCKET).upload(path, framed, {
        contentType: "image/webp",
        upsert: false,
      });
      if (uploaded.error) throw new Error(uploaded.error.message);
      const next = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      replacements.set(url, next);
      summary.reframed += 1;
    } catch (cause) {
      summary.failed += 1;
      summary.errors.push(`${url}: ${cause instanceof Error ? cause.message : "Fehler"}`);
    }
  }

  let databaseFailed = false;
  for (const product of products) {
    const image = product.image ? replacements.get(product.image) ?? product.image : product.image;
    const images = urlList(product.images).map((url) => replacements.get(url) ?? url);
    const imageChanged = image !== product.image;
    const listChanged = images.some((url, index) => url !== urlList(product.images)[index]);
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

  if (!databaseFailed && replacements.size > 0) {
    const stale = [...replacements.keys()]
      .map((url) => storageObjectPath(url))
      .filter((path): path is string => Boolean(path));
    if (stale.length) await supabase.storage.from(BUCKET).remove(stale);
  }

  return summary;
}
