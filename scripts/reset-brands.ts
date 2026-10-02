/**
 * Marken-Reset gegen Supabase.
 *
 * Produktion (Standard — verweigert localhost):
 *   PRODUCTION_SUPABASE_URL=https://xxxx.supabase.co \
 *   PRODUCTION_SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node --import tsx scripts/reset-brands.ts --production
 *
 * Lokal (explizit):
 *   node --import tsx scripts/reset-brands.ts --local
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resetAndImportBrands } from "../src/lib/brand-reset";
import { resolveSupabaseTarget } from "../src/lib/supabase-target";

function loadEnv() {
  for (const file of [".env.production.local", ".env.production", ".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    const text = readFileSync(file, "utf8");
    for (const line of text.split("\n")) {
      if (!line || line.startsWith("#")) continue;
      const i = line.indexOf("=");
      if (i < 0) continue;
      const k = line.slice(0, i).trim();
      let v = line.slice(i + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!(k in process.env)) process.env[k] = v;
    }
  }
}

async function main() {
  loadEnv();
  const args = new Set(process.argv.slice(2));
  const wantLocal = args.has("--local") || process.env.ALLOW_LOCAL_SUPABASE === "1";
  const wantProduction =
    args.has("--production") ||
    args.has("--prod") ||
    (!wantLocal && process.env.FORCE_PRODUCTION_SUPABASE !== "0");

  const target = resolveSupabaseTarget({
    production: wantProduction && !wantLocal,
    allowLocal: wantLocal,
  });

  console.log(`▶ Brand reset target: ${target.label}`);
  console.log(`▶ URL host: ${new URL(target.url).host}`);

  if (target.label !== "production" && wantProduction) {
    throw new Error("Produktions-Ziel erwartet, aber lokal aufgelöst.");
  }

  const supabase = createClient(target.url, target.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Sanity: Host nochmal prüfen
  const host = new URL(target.url).hostname;
  if (wantProduction && (host === "127.0.0.1" || host === "localhost")) {
    throw new Error("Abbruch: Produktions-Reset darf nicht gegen localhost laufen.");
  }

  console.log("▶ Brand reset starting…");
  const result = await resetAndImportBrands(supabase, {
    targetLabel: target.label,
  });
  console.log(JSON.stringify(result, null, 2));
  console.log("✓ Done");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
