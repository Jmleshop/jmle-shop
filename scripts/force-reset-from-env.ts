/**
 * Marken-Reset direkt aus .env.local — ohne MCP/Plugin-Auth.
 *
 * Liest (in dieser Reihenfolge):
 *   SUPABASE_URL | NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node --import tsx scripts/force-reset-from-env.ts
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { resetAndImportBrands } from "../src/lib/brand-reset";
import { brandCatalogCount } from "../src/lib/brand-catalog";

function loadEnvLocal() {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
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
      // .env.local hat Vorrang für dieses Skript
      process.env[k] = v;
    }
  }
}

async function main() {
  loadEnvLocal();

  const url = (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ""
  ).trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL (oder NEXT_PUBLIC_SUPABASE_URL) und SUPABASE_SERVICE_ROLE_KEY fehlen in .env.local"
    );
  }

  const host = new URL(url).hostname;
  console.log(`▶ Force-reset from .env.local → ${host}`);
  console.log(`▶ Expected brands: ${brandCatalogCount()}`);

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const result = await resetAndImportBrands(supabase, {
    targetLabel: `env.local:${host}`,
  });

  console.log(JSON.stringify({ ok: true, host, expectedBrands: brandCatalogCount(), ...result }, null, 2));
  console.log("✓ Done");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
