/**
 * Ersetzt tote externe Bild-URLs durch funktionierende Quellen
 * und läuft die Turbo-Pipeline (Freisteller + Zentrierung).
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { optimizeProductImageBuffer } from "../src/lib/optimize-product-image";
import { storageObjectPath } from "../src/lib/reprocess-product-images";

function loadEnv() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i < 0) continue;
    const key = trimmed.slice(0, i);
    let val = trimmed.slice(i + 1);
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

/** Stabile, öffentlich erreichbare Produkt-ähnliche Fotos */
const FALLBACK_BY_NAME: Record<string, string> = {
  Labneh: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=1200&q=90",
  Halloumi: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=1200&q=90",
  "Rote Linsen": "https://images.unsplash.com/photo-1516684669134-de6f7c473a2a?w=1200&q=90",
  "Sieben-Gewürze-Mischung":
    "https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=1200&q=90",
  Kurkuma: "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=1200&q=90",
  "Ägyptischer Reis":
    "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=1200&q=90",
};

async function download(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { "User-Agent": "jmle-image-optimizer/1.0" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Download ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await sb
    .from("products")
    .select("id, name_de, name_ar, image, images");
  if (error) throw error;

  const BUCKET = "product-images";
  let fixed = 0;
  let failed = 0;

  for (const product of data ?? []) {
    const image = product.image as string | null;
    if (!image) continue;
    const onStorage = Boolean(storageObjectPath(image));
    if (onStorage) continue; // bereits migriert

    const name = (product.name_de || product.name_ar || "") as string;
    const source = FALLBACK_BY_NAME[name];
    if (!source) {
      console.warn("[skip] no fallback for", name, product.id);
      failed += 1;
      continue;
    }

    try {
      console.log("[fix]", name, "←", source);
      const input = await download(source);
      const optimized = await optimizeProductImageBuffer(input, {
        removeBackground: true,
        force: true,
      });
      const path = `products/${crypto.randomUUID()}.webp`;
      const uploaded = await sb.storage.from(BUCKET).upload(path, optimized.buffer, {
        contentType: "image/webp",
        upsert: false,
      });
      if (uploaded.error) throw new Error(uploaded.error.message);
      const next = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      const images = Array.isArray(product.images)
        ? (product.images as string[]).map((u) => (u === image ? next : u))
        : [next];
      const updated = await sb
        .from("products")
        .update({ image: next, images })
        .eq("id", product.id);
      if (updated.error) throw new Error(updated.error.message);
      const stale = storageObjectPath(image);
      if (stale) await sb.storage.from(BUCKET).remove([stale]);
      fixed += 1;
      console.log("  →", next, `${optimized.width}x${optimized.height}`);
    } catch (err) {
      failed += 1;
      console.error("[fail]", name, err);
    }
  }

  console.log(JSON.stringify({ fixed, failed }, null, 2));
  if (failed) process.exitCode = 2;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
