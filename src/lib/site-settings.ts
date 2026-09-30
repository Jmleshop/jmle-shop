import type { SupabaseClient } from "@supabase/supabase-js";

/** Stabile IDs für Schemas, in denen site_settings.id NOT NULL ist. */
export const SITE_SETTING_ROW_IDS: Record<string, string> = {
  site: "site_config_main",
  site_logo: "site_logo_main",
};

export function siteSettingRowId(key: string): string {
  return SITE_SETTING_ROW_IDS[key] ?? `site_setting_${key}`;
}

/** Rohe Postgres-/PostgREST-Fehler in Admin-taugliche Meldungen übersetzen. */
export function friendlySiteSettingsError(
  message: string,
  lang: "de" | "ar" = "de"
): string {
  const raw = message || "";
  if (/null value in column ["']?id["']?/i.test(raw)) {
    return lang === "de"
      ? "Speichern fehlgeschlagen: Datenbank-ID fehlt. Bitte Seite neu laden und erneut speichern."
      : "فشل الحفظ: معرّف قاعدة البيانات مفقود. يرجى إعادة تحميل الصفحة والمحاولة مرة أخرى.";
  }
  if (/duplicate key|unique constraint/i.test(raw)) {
    return lang === "de"
      ? "Speichern fehlgeschlagen: Eintrag existiert bereits."
      : "فشل الحفظ: السجل موجود بالفعل.";
  }
  if (/row-level security|permission denied|42501/i.test(raw)) {
    return lang === "de"
      ? "Keine Berechtigung zum Speichern der Site-Einstellungen."
      : "لا توجد صلاحية لحفظ إعدادات الموقع.";
  }
  if (/Could not find the ['"]id['"] column|PGRST204/i.test(raw)) {
    return lang === "de"
      ? "Datenbank-Schema veraltet. Bitte Migration ausführen oder Support kontaktieren."
      : "مخطط قاعدة البيانات قديم. يرجى تشغيل الترحيل أو التواصل مع الدعم.";
  }
  // Keine rohen SQL-Details an den Admin
  if (/violates|relation|column|SQL|postgres|PGRST/i.test(raw)) {
    return lang === "de"
      ? "Site-Einstellungen konnten nicht gespeichert werden. Bitte erneut versuchen."
      : "تعذّر حفظ إعدادات الموقع. يرجى المحاولة مرة أخرى.";
  }
  return raw.slice(0, 200) || (lang === "de" ? "Unbekannter Fehler" : "خطأ غير معروف");
}

type UpsertResult = {
  data?: { value: unknown } | null;
  error?: string;
};

/**
 * Robustes Speichern von site_settings:
 * 1) Update vorhandener Zeile per key
 * 2) Insert mit stabiler id (für Schemas mit id NOT NULL)
 * 3) Fallback Insert ohne id (Schema nur key PK)
 */
export async function upsertSiteSetting(
  supabase: SupabaseClient,
  key: string,
  value: unknown
): Promise<UpsertResult> {
  const updated_at = new Date().toISOString();
  const id = siteSettingRowId(key);

  const { data: existing, error: readError } = await supabase
    .from("site_settings")
    .select("key")
    .eq("key", key)
    .maybeSingle();

  if (readError) {
    return { error: friendlySiteSettingsError(readError.message) };
  }

  if (existing) {
    const { data, error } = await supabase
      .from("site_settings")
      .update({ value, updated_at })
      .eq("key", key)
      .select("value")
      .maybeSingle();
    if (error) {
      return { error: friendlySiteSettingsError(error.message) };
    }
    return { data: data ?? { value } };
  }

  // Neu anlegen — zuerst mit id (deckt NOT NULL id ab)
  const withId = { id, key, value, updated_at };
  const insertWithId = await supabase
    .from("site_settings")
    .insert(withId)
    .select("value")
    .maybeSingle();

  if (!insertWithId.error) {
    return { data: insertWithId.data ?? { value } };
  }

  const msg = insertWithId.error.message || "";

  // Schema ohne id-Spalte
  if (/Could not find the ['"]id['"] column|PGRST204/i.test(msg)) {
    const insertKeyOnly = await supabase
      .from("site_settings")
      .insert({ key, value, updated_at })
      .select("value")
      .maybeSingle();
    if (insertKeyOnly.error) {
      return { error: friendlySiteSettingsError(insertKeyOnly.error.message) };
    }
    return { data: insertKeyOnly.data ?? { value } };
  }

  // id NOT NULL ohne Default — UUID versuchen
  if (/null value in column ["']?id["']?/i.test(msg)) {
    const insertUuid = await supabase
      .from("site_settings")
      .insert({ id: crypto.randomUUID(), key, value, updated_at })
      .select("value")
      .maybeSingle();
    if (insertUuid.error) {
      return { error: friendlySiteSettingsError(insertUuid.error.message) };
    }
    return { data: insertUuid.data ?? { value } };
  }

  // Upsert-Fallback (race: Zeile zwischen select und insert entstanden)
  if (/duplicate key|unique constraint/i.test(msg)) {
    const { data, error } = await supabase
      .from("site_settings")
      .update({ value, updated_at })
      .eq("key", key)
      .select("value")
      .maybeSingle();
    if (error) {
      return { error: friendlySiteSettingsError(error.message) };
    }
    return { data: data ?? { value } };
  }

  return { error: friendlySiteSettingsError(msg) };
}
