import type { SupabaseClient } from "@supabase/supabase-js";
import { BRAND_CATALOG } from "@/lib/brand-catalog";
import {
  buildAliasIndex,
  matchProductToBrand,
  type ProductMatchInput,
} from "@/lib/brand-match";

const PLACEHOLDER = "/placeholder.svg";
const PAGE = 500;

export type BrandResetResult = {
  target?: string;
  deletedBrands: number;
  insertedBrands: number;
  productsScanned: number;
  productsMatched: number;
  productsCleared: number;
  matches: Array<{ productId: string; brandId: string; title: string }>;
};

async function fetchAllProducts(
  supabase: SupabaseClient
): Promise<ProductMatchInput[]> {
  const out: ProductMatchInput[] = [];
  let from = 0;
  for (;;) {
    const to = from + PAGE - 1;
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name_ar, name_de, description, ingredients, allergens, custom_note, barcode, product_number, brand_id, deleted_at"
      )
      .is("deleted_at", null)
      .range(from, to);
    if (error) throw new Error(`load products failed: ${error.message}`);
    const batch = (data ?? []) as ProductMatchInput[];
    out.push(...batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

async function updateBrandIds(
  supabase: SupabaseClient,
  productIds: string[],
  brandId: string
) {
  for (let i = 0; i < productIds.length; i += 100) {
    const chunk = productIds.slice(i, i + 100);
    const { error } = await supabase
      .from("products")
      .update({ brand_id: brandId })
      .in("id", chunk);
    if (error) {
      throw new Error(
        `brand_id update failed (${brandId}): ${error.message}`
      );
    }
  }
}

/**
 * Kompletter Marken-Reset auf der übergebenen Supabase-Instanz.
 */
export async function resetAndImportBrands(
  supabase: SupabaseClient,
  opts?: { targetLabel?: string }
): Promise<BrandResetResult> {
  // 1) Verknüpfungen lösen (alle Zeilen, auch soft-deleted)
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
    for (let i = 0; i < oldIds.length; i += 100) {
      const chunk = oldIds.slice(i, i + 100);
      const { error: delErr, count } = await supabase
        .from("brand_logos")
        .delete({ count: "exact" })
        .in("id", chunk);
      if (delErr) throw new Error(`delete brands failed: ${delErr.message}`);
      deletedBrands += count ?? chunk.length;
    }
  }

  // 3) Neue Marken (chunked insert)
  if (BRAND_CATALOG.length !== 71) {
    throw new Error(
      `Brand catalog size mismatch: expected 71, got ${BRAND_CATALOG.length}`
    );
  }

  const rows = BRAND_CATALOG.map((b, i) => ({
    id: b.id,
    name: b.name,
    image: PLACEHOLDER,
    link_url: null as string | null,
    sort_order: i + 1,
    active: true,
  }));

  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50);
    const { error: insErr } = await supabase.from("brand_logos").insert(chunk);
    if (insErr) throw new Error(`insert brands failed: ${insErr.message}`);
  }

  // 4) Robustes Matching über alle Produktfelder (batch updates)
  const list = await fetchAllProducts(supabase);
  const aliasIndex = buildAliasIndex(BRAND_CATALOG);
  const byBrand = new Map<string, string[]>();
  const matches: BrandResetResult["matches"] = [];

  for (const p of list) {
    const brandId = matchProductToBrand(p, aliasIndex);
    if (!brandId) continue;
    const ids = byBrand.get(brandId) ?? [];
    ids.push(String(p.id));
    byBrand.set(brandId, ids);
    matches.push({
      productId: String(p.id),
      brandId,
      title: String(p.name_de || p.name_ar || p.id),
    });
  }

  for (const [brandId, ids] of byBrand) {
    await updateBrandIds(supabase, ids, brandId);
  }

  return {
    target: opts?.targetLabel,
    deletedBrands,
    insertedBrands: rows.length,
    productsScanned: list.length,
    productsMatched: matches.length,
    productsCleared,
    matches,
  };
}
