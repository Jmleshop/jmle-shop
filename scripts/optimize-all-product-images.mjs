#!/usr/bin/env node
/**
 * Einmalige Migration: alle Produktbilder freistellen + 1:1 zentrieren (10 % Padding).
 * Usage: node scripts/optimize-all-product-images.mjs
 * Benötigt .env.local mit NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const base = process.env.OPTIMIZE_API_BASE || "http://127.0.0.1:3000";

async function main() {
  // Dynamischer Import der Server-Lib über tsx wenn verfügbar, sonst HTTP-Chunks
  let useLib = false;
  try {
    await import("tsx/esm/api");
    useLib = true;
  } catch {
    useLib = false;
  }

  if (useLib) {
    const { register } = await import("tsx/esm/api");
    register();
    const { reprocessAllProductImages } = await import(
      "../src/lib/reprocess-product-images.ts"
    );
    const sb = createClient(url, key);
    console.log("[optimize] starting full reprocess via library…");
    const summary = await reprocessAllProductImages(sb);
    console.log(JSON.stringify(summary, null, 2));
    if (summary.failed > 0) process.exitCode = 2;
    return;
  }

  // Fallback: HTTP chunk API (Admin-Session nicht nötig wenn Service-Role im Server)
  // → Direkt lib mit node --import tsx
  console.error("Bitte mit: npx tsx scripts/optimize-all-product-images.ts ausführen");
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
