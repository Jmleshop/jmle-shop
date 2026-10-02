/**
 * Generates scripts/brand-reset-production.sql from BRAND_CATALOG.
 * Run: npx tsx scripts/generate-brand-reset-sql.ts
 */
import { writeFileSync } from "fs";
import { BRAND_CATALOG } from "../src/lib/brand-catalog";
import { normalizeMatchText } from "../src/lib/brand-match";

const STRICT_AR = new Set([
  "هنا",
  "لينا",
  "رنا",
  "لارا",
  "دانا",
  "دانه",
  "بوك",
  "مازا",
  "نجار",
  "زوان",
  "بلبل",
  "ديمو",
  "شوكس",
  "دومو",
  "كيري",
  "راني",
  "احمد",
  "محمود",
  "شهيه",
  "كرزه",
  "هامول",
  "سومار",
  "توسكا",
]);

function sqlEscape(s: string) {
  return s.replace(/'/g, "''");
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isLatin(alias: string) {
  return /[a-z]/i.test(alias) && !/[\u0600-\u06FF]/.test(alias);
}

function needsStrict(alias: string) {
  if (isLatin(alias)) return true;
  const n = normalizeMatchText(alias);
  return n.length <= 3 || STRICT_AR.has(n);
}

const blob =
  "concat_ws(' ', coalesce(name_ar,''), coalesce(name_de,''), coalesce(description,''), coalesce(ingredients,''), coalesce(allergens,''), coalesce(custom_note,''), coalesce(barcode,''), coalesce(product_number,''))";

function cond(alias: string) {
  const a = sqlEscape(alias);
  if (needsStrict(alias)) {
    if (isLatin(alias)) {
      const pat = sqlEscape(escapeRegExp(alias));
      return `(${blob} ~* '\\m${pat}\\M')`;
    }
    const pat = sqlEscape(escapeRegExp(alias));
    return `(${blob} ~* '(^|[[:space:]])${pat}([[:space:]]|$)')`;
  }
  return `(${blob} ILIKE '%${a}%')`;
}

if (BRAND_CATALOG.length !== 71) {
  throw new Error(`Expected 71 brands, got ${BRAND_CATALOG.length}`);
}

const lines: string[] = [];
lines.push(
  "-- Production brand catalog reset: exactly 71 brands + robust product rematch"
);
lines.push(
  "-- Re-runnable. Preferred TS path: PRODUCTION_SUPABASE_* + scripts/reset-brands.ts --production"
);
lines.push("BEGIN;");
lines.push(
  "UPDATE public.products SET brand_id = NULL WHERE brand_id IS NOT NULL;"
);
lines.push("DELETE FROM public.brand_logos;");
lines.push(
  "INSERT INTO public.brand_logos (id, name, image, link_url, sort_order, active) VALUES"
);
const vals = BRAND_CATALOG.map(
  (b, i) =>
    `  ('${sqlEscape(b.id)}', '${sqlEscape(b.name)}', '/placeholder.svg', NULL, ${i + 1}, true)`
);
lines.push(vals.join(",\n") + ";");

type Row = { brandId: string; alias: string; len: number };
const aliasRows: Row[] = [];
for (const b of BRAND_CATALOG) {
  for (const alias of b.aliases) {
    aliasRows.push({
      brandId: b.id,
      alias,
      len: normalizeMatchText(alias).length,
    });
  }
}
aliasRows.sort((a, b) => b.len - a.len);

for (const row of aliasRows) {
  lines.push(
    `UPDATE public.products SET brand_id = '${sqlEscape(row.brandId)}' WHERE deleted_at IS NULL AND brand_id IS NULL AND ${cond(row.alias)};`
  );
}
lines.push("COMMIT;");
lines.push("");
lines.push("-- SELECT count(*) FROM public.brand_logos; -- expect 71");
lines.push(
  "-- SELECT brand_id, count(*) FROM public.products WHERE brand_id IS NOT NULL GROUP BY 1 ORDER BY 2 DESC;"
);

writeFileSync("scripts/brand-reset-production.sql", lines.join("\n") + "\n");
console.log(
  "wrote scripts/brand-reset-production.sql",
  lines.length,
  "lines;",
  BRAND_CATALOG.length,
  "brands"
);
