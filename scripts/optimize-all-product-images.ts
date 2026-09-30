/**
 * Einmalige Migration aller Produktbilder:
 * Freisteller + Trim + 1:1-Zentrierung (10 % Padding) → Storage → DB.
 *
 *   npx tsx scripts/optimize-all-product-images.ts
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { reprocessAllProductImages } from "../src/lib/reprocess-product-images";

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

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen");
  }
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  console.log("[optimize] Starte Auto-Zentrierung + Freisteller für alle Produktbilder…");
  const started = Date.now();
  const summary = await reprocessAllProductImages(sb);
  console.log("[optimize] Fertig in", Math.round((Date.now() - started) / 1000), "s");
  console.log(JSON.stringify(summary, null, 2));
  if (summary.failed > 0) process.exitCode = 2;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
