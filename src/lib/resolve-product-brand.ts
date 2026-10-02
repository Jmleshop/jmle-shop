import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Löst brand_id auf — nur bestehende Marken aus dem Dropdown.
 * Keine automatische Neuanlage mehr per Freitext.
 */
export async function resolveProductBrand(
  supabase: SupabaseClient,
  input: { brand_id?: string | null; brand_name?: string | null }
): Promise<{ brand_id: string | null }> {
  const id = (input.brand_id || "").trim();
  if (!id) return { brand_id: null };

  const { data } = await supabase
    .from("brand_logos")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (data?.id) return { brand_id: String(data.id) };
  return { brand_id: null };
}

export function stripBrandName<T extends { brand_name?: string | null }>(
  payload: T
): Omit<T, "brand_name"> {
  const { brand_name: _n, ...rest } = payload;
  void _n;
  return rest;
}
