import type { SupabaseClient } from "@supabase/supabase-js";

export type DetachResult = {
  detached: number;
  error?: string;
};

/**
 * Löst alle Produkte von einer Kategorie (category_id → NULL).
 * Produkte werden niemals gelöscht — nur die Zuordnung entfernt.
 */
export async function detachProductsFromCategory(
  supabase: SupabaseClient,
  categoryId: string
): Promise<DetachResult> {
  const { data: linked, error: readError } = await supabase
    .from("products")
    .select("id")
    .eq("category_id", categoryId);

  if (readError) {
    return { detached: 0, error: readError.message };
  }

  const ids = (linked ?? []).map((row) => row.id as string);
  if (!ids.length) {
    return { detached: 0 };
  }

  const { error: updateError } = await supabase
    .from("products")
    .update({ category_id: null })
    .eq("category_id", categoryId);

  if (updateError) {
    return { detached: 0, error: updateError.message };
  }

  return { detached: ids.length };
}

/** Anzeige-Label wenn Produkt keine (aktive) Kategorie hat. */
export function uncategorizedLabel(lang: "de" | "ar" = "de"): string {
  return lang === "de" ? "ohne Kategorie" : "بدون فئة";
}
