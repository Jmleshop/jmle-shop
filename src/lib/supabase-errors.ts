/**
 * Tabelle existiert in der Datenbank nicht (PostgREST: PGRST205 "Could not find the table … in the schema cache",
 * Postgres: 42P01). In Produktion fehlen z. B. `orders`/`order_items`, solange Stripe ausgeschaltet ist.
 */
export function isMissingTableError(error: { code?: string | null; message?: string | null } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "PGRST205" || error.code === "42P01") return true;
  return /could not find the table|relation "[^"]+" does not exist/i.test(error.message ?? "");
}
