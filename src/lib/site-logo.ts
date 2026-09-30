import type { SupabaseClient } from "@supabase/supabase-js";

export const SITE_LOGO_KEY = "site_logo";

/** Extrahiert Logo-URL aus site_settings.value (String oder {url}). */
export function parseSiteLogoValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object") {
    const url = (value as { url?: unknown }).url;
    if (typeof url === "string") return url.trim();
  }
  return "";
}

export async function readSiteLogo(
  supabase: SupabaseClient
): Promise<string> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", SITE_LOGO_KEY)
    .maybeSingle();
  if (error || !data) return "";
  return parseSiteLogoValue(data.value);
}

export async function writeSiteLogo(
  supabase: SupabaseClient,
  logoUrl: string
): Promise<{ error?: string }> {
  const url = logoUrl.trim();
  const { error } = await supabase.from("site_settings").upsert({
    key: SITE_LOGO_KEY,
    value: { url },
    updated_at: new Date().toISOString(),
  });
  return error ? { error: error.message } : {};
}
