import type { SupabaseClient } from "@supabase/supabase-js";

const PLACEHOLDER = "/placeholder.svg";

/**
 * Löst brand_id auf: vorhandene ID, Matching per Name, oder neue Marke anlegen.
 * brand_name wird aus dem DB-Payload entfernt.
 */
export async function resolveProductBrand(
  supabase: SupabaseClient,
  input: { brand_id?: string | null; brand_name?: string | null }
): Promise<{ brand_id: string | null }> {
  const id = (input.brand_id || "").trim();
  const name = (input.brand_name || "").trim();

  if (id) {
    const { data } = await supabase
      .from("brand_logos")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (data?.id) return { brand_id: data.id };
  }

  if (!name) return { brand_id: null };

  const { data: existing } = await supabase
    .from("brand_logos")
    .select("id, name")
    .ilike("name", name)
    .limit(20);

  const match = (existing ?? []).find(
    (row) => String(row.name || "").trim().toLowerCase() === name.toLowerCase()
  );
  if (match?.id) return { brand_id: String(match.id) };

  const newId = `brand-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;

  const { data: created, error } = await supabase
    .from("brand_logos")
    .insert({
      id: newId,
      name,
      image: PLACEHOLDER,
      link_url: null,
      sort_order: 0,
      active: true,
    })
    .select("id")
    .single();

  if (error || !created?.id) {
    console.error("[resolve-product-brand]", error?.message);
    return { brand_id: null };
  }

  return { brand_id: String(created.id) };
}

export function stripBrandName<T extends { brand_name?: string | null }>(
  payload: T
): Omit<T, "brand_name"> {
  const { brand_name: _n, ...rest } = payload;
  void _n;
  return rest;
}
