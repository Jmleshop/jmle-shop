/**
 * Marken-Reset aus Runtime-Env — ohne MCP/Plugin-Auth.
 *
 * Credentials (Standard):
 *   NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * Optional:
 *   PRODUCTION_SUPABASE_* / SUPABASE_URL
 *
 * Usage:
 *   npm run brand-reset
 *   node --import tsx scripts/force-reset-from-env.ts
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { resetAndImportBrands } from "../src/lib/brand-reset";
import { brandCatalogCount } from "../src/lib/brand-catalog";
import { resolveRuntimeSupabaseTarget } from "../src/lib/supabase-target";

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
      process.env[k] = v;
    }
  }
}

async function main() {
  loadEnvLocal();

  const target = resolveRuntimeSupabaseTarget();
  const host = new URL(target.url).hostname;

  console.log(`▶ Brand reset → ${host}`);
  console.log(`▶ Credentials: ${target.hint}`);
  console.log(`▶ Expected brands: ${brandCatalogCount()}`);

  const supabase = createClient(target.url, target.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const result = await resetAndImportBrands(supabase, {
    targetLabel: `env:${host}`,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        host,
        label: target.label,
        hint: target.hint,
        expectedBrands: brandCatalogCount(),
        ...result,
      },
      null,
      2
    )
  );
  console.log("✓ Done");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
