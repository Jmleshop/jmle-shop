import { BRAND_CATALOG, type BrandSeed } from "@/lib/brand-catalog";
import {
  aliasesFromLogoName,
  logoNameCandidates,
} from "@/lib/brand-logo-aliases";
import {
  buildAliasIndex,
  matchProductToBrand,
  normalizeMatchText,
  productSearchBlob,
  textContainsAlias,
  type ProductMatchInput,
} from "@/lib/brand-match";
import type { BrandLogo, Product } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type BrandLinkProduct = Pick<
  Product,
  "id" | "name" | "nameDe" | "description" | "ingredients" | "brandId"
> & {
  allergens?: string;
  customNote?: string;
  barcode?: string | null;
};

/** Map storefront Product → matcher input. */
export function toProductMatchInput(p: BrandLinkProduct): ProductMatchInput {
  return {
    id: p.id,
    name_ar: p.name,
    name_de: p.nameDe,
    description: p.description,
    ingredients: p.ingredients,
    allergens: p.allergens,
    custom_note: p.customNote,
    barcode: p.barcode,
    brand_id: p.brandId,
  };
}

function seedMatchesToken(seed: BrandSeed, token: string): boolean {
  const norm = normalizeMatchText(token);
  if (!norm) return false;
  if (normalizeMatchText(seed.name) === norm) return true;
  for (const alias of seed.aliases) {
    const a = normalizeMatchText(alias);
    if (!a) continue;
    if (a === norm) return true;
    // Logo "Do Ghazal Tea" ↔ alias "Do Ghazal"; logo "hamol" ↔ "Hamoul"
    if (textContainsAlias(token, alias) || textContainsAlias(alias, token)) {
      return true;
    }
  }
  return false;
}

/** Find catalog seed for a brand logo / id / display name. */
export function findBrandSeed(
  brandId: string,
  brandName?: string | null
): BrandSeed | undefined {
  const id = String(brandId || "").trim();
  const byId = BRAND_CATALOG.find((b) => b.id === id);
  if (byId) return byId;

  const name = String(brandName || "").trim();
  if (!name) return undefined;

  const tokens = [
    ...logoNameCandidates(name),
    ...aliasesFromLogoName(name),
  ];

  for (const token of tokens) {
    const hit = BRAND_CATALOG.find((b) => seedMatchesToken(b, token));
    if (hit) return hit;
  }
  return undefined;
}

/** Aliases used to match products to a brand logo. */
export function aliasesForBrand(
  brandId: string,
  brandName?: string | null
): string[] {
  const seed = findBrandSeed(brandId, brandName);
  const fromLogo = aliasesFromLogoName(brandName);
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (s: string) => {
    const t = s.trim();
    if (!t) return;
    const key = normalizeMatchText(t);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(t);
  };
  if (seed?.aliases?.length) for (const a of seed.aliases) add(a);
  for (const a of fromLogo) add(a);
  if (brandName) add(brandName);
  return out;
}

/** True when product.brandId matches or product text contains a brand alias. */
export function productMatchesBrand(
  product: BrandLinkProduct,
  brandId: string,
  brandName?: string | null
): boolean {
  const resolved = String(brandId || "").trim();
  if (!resolved) return false;
  if (product.brandId && product.brandId === resolved) return true;

  const aliases = aliasesForBrand(resolved, brandName);
  if (!aliases.length) return false;
  const blob = productSearchBlob(toProductMatchInput(product));
  return aliases.some((alias) => textContainsAlias(blob, alias));
}

/**
 * Resolve the best brand id for a product:
 * 1) explicit brandId, 2) alias match against BRAND_CATALOG.
 */
export function resolveProductBrandId(
  product: BrandLinkProduct
): string | null {
  if (product.brandId) return product.brandId;
  const aliasIndex = buildAliasIndex(BRAND_CATALOG);
  return matchProductToBrand(toProductMatchInput(product), aliasIndex);
}

/** Filter a product list to one brand (id link and/or name/alias match). */
export function filterProductsForBrand(
  products: BrandLinkProduct[],
  brandId: string,
  brandName?: string | null
): BrandLinkProduct[] {
  return products.filter((p) => productMatchesBrand(p, brandId, brandName));
}

/**
 * Soft sync: set products.brand_id from alias matching against existing logos.
 * Does NOT delete or recreate brand_logos (preserves uploaded logos).
 */
export async function syncProductBrandLinks(
  supabase: SupabaseClient
): Promise<{
  productsScanned: number;
  productsMatched: number;
  productsUpdated: number;
  brandsKnown: number;
  matches: Array<{ productId: string; brandId: string; title: string }>;
}> {
  const { data: logos, error: logoErr } = await supabase
    .from("brand_logos")
    .select("id, name, active")
    .eq("active", true);
  if (logoErr) throw new Error(`load brands failed: ${logoErr.message}`);

  const logoList = (logos ?? []) as BrandLogo[];
  const logoById = new Map(logoList.map((l) => [l.id, l]));
  /** Map catalog brand id → existing logo id (id or name match). */
  const catalogToLogo = new Map<string, string>();
  for (const seed of BRAND_CATALOG) {
    if (logoById.has(seed.id)) {
      catalogToLogo.set(seed.id, seed.id);
      continue;
    }
    const byName = logoList.find((l) => {
      if (normalizeMatchText(l.name) === normalizeMatchText(seed.name)) {
        return true;
      }
      return seed.aliases.some(
        (a) =>
          normalizeMatchText(a) === normalizeMatchText(l.name) ||
          textContainsAlias(l.name, a) ||
          textContainsAlias(a, l.name)
      );
    });
    if (byName) catalogToLogo.set(seed.id, byName.id);
  }

  const PAGE = 500;
  const products: ProductMatchInput[] = [];
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
    products.push(...batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }

  const aliasIndex = buildAliasIndex(BRAND_CATALOG);
  const byLogoId = new Map<string, string[]>();
  const matches: Array<{ productId: string; brandId: string; title: string }> =
    [];
  let matched = 0;

  for (const p of products) {
    const catalogBrandId = matchProductToBrand(p, aliasIndex);
    if (!catalogBrandId) continue;
    const logoId = catalogToLogo.get(catalogBrandId);
    if (!logoId) continue;
    matched += 1;
    if (p.brand_id === logoId) continue;
    const ids = byLogoId.get(logoId) ?? [];
    ids.push(String(p.id));
    byLogoId.set(logoId, ids);
    matches.push({
      productId: String(p.id),
      brandId: logoId,
      title: String(p.name_de || p.name_ar || p.id),
    });
  }

  let updated = 0;
  for (const [logoId, ids] of byLogoId) {
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      const { error } = await supabase
        .from("products")
        .update({ brand_id: logoId })
        .in("id", chunk);
      if (error) {
        throw new Error(`brand_id update failed (${logoId}): ${error.message}`);
      }
      updated += chunk.length;
    }
  }

  return {
    productsScanned: products.length,
    productsMatched: matched,
    productsUpdated: updated,
    brandsKnown: logoList.length,
    matches,
  };
}
