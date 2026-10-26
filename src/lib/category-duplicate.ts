/** Vergleichsform eines Kategorienamens: Leerraum zusammengefasst, Groß-/Kleinschreibung egal. */
export function normalizeCategoryName(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

type CategoryRow = {
  id: string;
  name_ar?: string | null;
  parent_id?: string | null;
  deleted_at?: string | null;
};

/**
 * Sucht eine aktive Kategorie mit gleichem arabischem Namen unter derselben Elternkategorie.
 * Gleiche Namen unter verschiedenen Eltern bleiben erlaubt; Papierkorb-Einträge zählen nicht.
 */
export function findDuplicateCategory<T extends CategoryRow>(
  rows: T[],
  candidate: { name_ar: string; parent_id?: string | null },
  excludeId?: string
): T | null {
  const name = normalizeCategoryName(candidate.name_ar);
  if (!name) return null;
  const parent = candidate.parent_id || null;
  return (
    rows.find(
      (row) =>
        row.id !== excludeId &&
        !row.deleted_at &&
        (row.parent_id || null) === parent &&
        normalizeCategoryName(row.name_ar) === name
    ) ?? null
  );
}
