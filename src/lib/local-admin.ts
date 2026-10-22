/** Nur die lokale Entwicklungsdatenbank, nie das Online-Projekt. */
export function isLocalDevAdmin() {
  if (process.env.NODE_ENV === "production") return false;
  try {
    const host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
    return host === "127.0.0.1" || host === "localhost";
  } catch {
    return false;
  }
}
