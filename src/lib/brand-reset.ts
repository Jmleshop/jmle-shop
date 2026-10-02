import type { SupabaseClient } from "@supabase/supabase-js";
import { BRAND_CATALOG } from "@/lib/brand-catalog";
import {
  buildAliasIndex,
  matchProductToBrand,
  type ProductMatchInput,
} from "@/lib/brand-match";

const PLACEHOLDER = "/placeholder.svg";

export type BrandResetResult = {
  deletedBrands: number;
  insertedBrands: number;
  productsScanned: number;
  productsMatched: number;
  productsCleared: number;
  matches: Array<{ productId: string; brandId: string; title: string }>;
};

/**
 * Kompletter Marken-Reset:
 * 1) brand_id aller Produkte nullen
 * 2) alle brand_logos löschen
 * 3) neuen Katalog einfügen
 * 4) Produkte per Titel/Beschreibung matchen
 */
export async function resetAndImportBrands(
  supabase: SupabaseClient
): Promise<BrandResetResult> {
  // 1) Verknüpfungen lösen
  const { data: beforeLinks, error: clearErr } = await supabase
    .from("products")
    .update({ brand_id: null })
    .not("brand_id", "is", null)
    .select("id");

  if (clearErr) {
    throw new Error(`brand_id clear failed: ${clearErr.message}`);
  }
  const productsCleared = beforeLinks?.length ?? 0;

  // 2) Alte Marken löschen
  const { data: existing, error: listErr } = await supabase
    .from("brand_logos")
    .select("id");
  if (listErr) throw new Error(`list brands failed: ${listErr.message}`);

  const oldIds = (existing ?? []).map((r) => String(r.id));
  let deletedBrands = 0;
  if (oldIds.length) {
    const { error: delErr, count } = await supabase
      .from("brand_logos")
      .delete({ count: "exact" })
      .in("id", oldIds);
    if (delErr) throw new Error(`delete brands failed: ${delErr.message}`);
    deletedBrands = count ?? oldIds.length;
  }

  // 3) Neue Marken
  const rows = BRAND_CATALOG.map((b, i) => ({
    id: b.id,
    name: b.name,
    image: PLACEHOLDER,
    link_url: null as string | null,
    sort_order: i + 1,
    active: true,
  }));

  const { error: insErr } = await supabase.from("brand_logos").insert(rows);
  if (insErr) throw new Error(`insert brands failed: ${insErr.message}`);

  // 4) Matching
  const { data: products, error: prodErr } = await supabase
    .from("products")
    .select(
      "id, name_ar, name_de, description, ingredients, custom_note, brand_id, deleted_at"
    )
    .is("deleted_at", null);

  if (prodErr) throw new Error(`load products failed: ${prodErr.message}`);

  const aliasIndex = buildAliasIndex(BRAND_CATALOG);
  const matches: BrandResetResult["matches"] = [];
  const list = (products ?? []) as ProductMatchInput[];

  for (const p of list) {
    const brandId = matchProductToBrand(p, aliasIndex);
    if (!brandId) continue;
    const { error: updErr } = await supabase
      .from("products")
      .update({ brand_id: brandId })
      .eq("id", p.id);
    if (updErr) {
      console.error("[brand-reset] match update", p.id, updErr.message);
      continue;
    }
    matches.push({
      productId: String(p.id),
      brandId,
      title: String(p.name_de || p.name_ar || p.id),
    });
  }

  return {
    deletedBrands,
    insertedBrands: rows.length,
    productsScanned: list.length,
    productsMatched: matches.length,
    productsCleared,
    matches,
  };
}
