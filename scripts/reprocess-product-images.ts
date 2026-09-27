import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { reprocessAllProductImages } from "../src/lib/reprocess-product-images";

function loadEnv(file: string) {
  const text = readFileSync(file, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Supabase service role is not configured");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const summary = await reprocessAllProductImages(supabase);
console.log(
  JSON.stringify({
    examined: summary.examined,
    reframed: summary.reframed,
    skipped: summary.skipped,
    failed: summary.failed,
    errors: summary.errors.slice(0, 8),
  })
);
if (summary.failed > 0) process.exitCode = 1;
