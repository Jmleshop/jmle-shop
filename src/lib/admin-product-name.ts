type Named = { id?: string; name_ar?: string | null; name_de?: string | null };

/**
 * Anzeigename im Admin. Der Shop ist arabisch-first: fast alle Produkte haben nur `name_ar`,
 * `name_de` ist meist leer. Darum Arabisch als Hauptname, Deutsch (falls vorhanden) darunter.
 */
export function adminProductName(product: Named): { primary: string; secondary: string } {
  const ar = String(product.name_ar ?? "").trim();
  const de = String(product.name_de ?? "").trim();
  const primary = ar || de || product.id || "—";
  return { primary, secondary: ar && de ? de : "" };
}
