export function getSupabaseUrl() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL fehlt");
  }
  return url;
}

export function getSupabaseAnonKey() {
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ""
  ).trim();
  if (!key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY fehlt");
  }
  return key;
}
