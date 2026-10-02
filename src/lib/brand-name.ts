/** Normalisierung für Markennamen-Duplikatprüfung (Admin). */
export function normalizeBrandName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isDuplicateBrandName(
  name: string,
  existing: Array<{ id?: string | null; name?: string | null }>,
  excludeId?: string
): boolean {
  const normalized = normalizeBrandName(name);
  if (!normalized) return false;
  return existing.some((row) => {
    const id = String(row.id || "");
    if (excludeId && id === excludeId) return false;
    return normalizeBrandName(String(row.name || "")) === normalized;
  });
}
