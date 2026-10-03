/**
 * Marken-Reset gegen Supabase.
 *
 * Standard (Runtime-Env):
 *   NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *   node --import tsx scripts/reset-brands.ts
 *
 * Optional Production-Override:
 *   PRODUCTION_SUPABASE_URL=… PRODUCTION_SUPABASE_SERVICE_ROLE_KEY=…
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resetAndImportBrands } from "../src/lib/brand-reset";
import { resolveRuntimeSupabaseTarget } from "../src/lib/supabase-target";

function loadEnv() {
  for (const file of [
    ".env.production.local",
    ".env.production",
    ".env.local",
    ".env",
  ]) {
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
  const target = resolveRuntimeSupabaseTarget();
  const host = new URL(target.url).hostname;

  console.log(`▶ Brand reset target: ${target.label}`);
  console.log(`▶ Credentials: ${target.hint}`);
  console.log(`▶ URL host: ${host}`);

  const supabase = createClient(target.url, target.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

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
