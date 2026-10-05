import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Löst brand_id auf — nur bestehende Marken aus dem Dropdown.
 * Keine automatische Neuanlage mehr per Freitext.
 * Ungültige IDs liefern einen Fehler (kein stilles NULL).
 */
export async function resolveProductBrand(
  supabase: SupabaseClient,
  input: { brand_id?: string | null; brand_name?: string | null }
): Promise<{ brand_id: string | null; error?: string }> {
  const id = (input.brand_id || "").trim();
  if (!id) return { brand_id: null };

  const { data, error } = await supabase
    .from("brand_logos")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (/relation|does not exist|42P01/i.test(error.message)) {
      return {
        brand_id: null,
        error:
          "Marken-Tabelle fehlt. Bitte Migration/SQL für brand_logos ausführen.",
      };
    }
    return { brand_id: null, error: error.message };
  }

  if (data?.id) return { brand_id: String(data.id) };
  return {
    brand_id: null,
    error: "Unbekannte Marke — bitte erneut aus dem Dropdown wählen.",
  };
}

export function stripBrandName<T extends { brand_name?: string | null }>(
  payload: T
): Omit<T, "brand_name"> {
  const { brand_name: _n, ...rest } = payload;
  void _n;
  return rest;
}
