import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeMatchText } from "@/lib/brand-match";

const PLACEHOLDER_LOGO = "/placeholder.svg";

/**
 * Löst brand_id auf:
 * 1) bestehende brand_id
 * 2) bestehende Marke per brand_name
 * 3) optional Neuanlage mit Platzhalter-Logo
 */
export async function resolveProductBrand(
  supabase: SupabaseClient,
  input: { brand_id?: string | null; brand_name?: string | null },
  opts?: { require?: boolean; createIfMissing?: boolean }
): Promise<{ brand_id: string | null; error?: string; created?: boolean }> {
  const id = (input.brand_id || "").trim();
  const name = (input.brand_name || "").trim();
  const requireBrand = opts?.require !== false;
  const createIfMissing = opts?.createIfMissing !== false;

  if (id && id !== "__new__") {
    const { data } = await supabase
      .from("brand_logos")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (data?.id) return { brand_id: String(data.id) };
    return {
      brand_id: null,
      error: `Marke ${id} nicht gefunden`,
    };
  }

  if (name) {
    const { data: logos } = await supabase
      .from("brand_logos")
      .select("id, name");
    const match = (logos ?? []).find(
      (row) =>
        normalizeMatchText(String(row.name || "")) === normalizeMatchText(name)
    );
    if (match?.id) return { brand_id: String(match.id) };

    if (!createIfMissing) {
      return { brand_id: null, error: `Marke „${name}“ nicht gefunden` };
    }

    const newId = `brand-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const { data: maxSort } = await supabase
      .from("brand_logos")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const sortOrder = Number(maxSort?.sort_order ?? 0) + 1;

    const { data: created, error } = await supabase
      .from("brand_logos")
      .insert({
        id: newId,
        name,
        image: PLACEHOLDER_LOGO,
        link_url: null,
        sort_order: sortOrder,
        active: true,
      })
      .select("id")
      .single();

    if (error || !created?.id) {
      return {
        brand_id: null,
        error: error?.message || "Marke konnte nicht angelegt werden",
      };
    }
    return { brand_id: String(created.id), created: true };
  }

  if (requireBrand) {
    return {
      brand_id: null,
      error: "Marke ist Pflicht — bitte wählen oder neu anlegen",
    };
  }
  return { brand_id: null };
}

export function stripBrandName<T extends { brand_name?: string | null }>(
  payload: T
): Omit<T, "brand_name"> {
  const { brand_name: _n, ...rest } = payload;
  void _n;
  return rest;
}
