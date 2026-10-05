import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Stabile UUIDs für bekannte Keys — immer mitsenden,
 * damit PostgREST/Postgres nie id=null inseriert.
 */
export const SITE_SETTING_ROW_IDS: Record<string, string> = {
  site: "00000000-0000-4000-8000-000000000001",
  site_logo: "00000000-0000-4000-8000-000000000002",
  layout_draft: "00000000-0000-4000-8000-000000000003",
  layout_published: "00000000-0000-4000-8000-000000000004",
  layout_versions: "00000000-0000-4000-8000-000000000005",
  builder_content_draft: "00000000-0000-4000-8000-000000000006",
};

export function siteSettingRowId(key: string): string {
  return SITE_SETTING_ROW_IDS[key] ?? crypto.randomUUID();
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
    // Spalte fehlt — Caller fallbackt; Message nur wenn alles scheitert
    return lang === "de"
      ? "Datenbank-Schema veraltet. Bitte Migration ausführen oder Support kontaktieren."
      : "مخطط قاعدة البيانات قديم. يرجى تشغيل الترحيل أو التواصل مع الدعم.";
  }
  if (/invalid input syntax for type uuid/i.test(raw)) {
    return lang === "de"
      ? "Speichern fehlgeschlagen: ungültige ID. Bitte erneut versuchen."
      : "فشل الحفظ: معرّف غير صالح. يرجى المحاولة مرة أخرى.";
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

function isMissingIdColumn(message: string): boolean {
  return /Could not find the ['"]id['"] column|PGRST204/i.test(message);
}

/**
 * Robustes Speichern von site_settings:
 * - Immer stabile/UUID-id mitsenden (verhindert null-id NOT NULL)
 * - Update wenn key existiert, sonst Insert
 * - Fallback ohne id-Spalte für ältere Schemas
 * - Zusätzlicher Upsert-Fallback bei Race Conditions
 */
export async function upsertSiteSetting(
  supabase: SupabaseClient,
  key: string,
  value: unknown
): Promise<UpsertResult> {
  const updated_at = new Date().toISOString();
  const id = siteSettingRowId(key);
  const base = { key, value, updated_at };
  const withId = { ...base, id };

  const { data: existing, error: readError } = await supabase
    .from("site_settings")
    .select("key, id")
    .eq("key", key)
    .maybeSingle();

  if (readError) {
    // select id kann scheitern wenn Spalte fehlt → ohne id weiterlesen
    if (isMissingIdColumn(readError.message)) {
      const retry = await supabase
        .from("site_settings")
        .select("key")
        .eq("key", key)
        .maybeSingle();
      if (retry.error) {
        return { error: friendlySiteSettingsError(retry.error.message) };
      }
      if (retry.data) {
        const upd = await supabase
          .from("site_settings")
          .update({ value, updated_at })
          .eq("key", key)
          .select("value")
          .maybeSingle();
        if (upd.error) {
          return { error: friendlySiteSettingsError(upd.error.message) };
        }
        return { data: upd.data ?? { value } };
      }
      const ins = await supabase
        .from("site_settings")
        .insert(base)
        .select("value")
        .maybeSingle();
      if (ins.error) {
        return { error: friendlySiteSettingsError(ins.error.message) };
      }
      return { data: ins.data ?? { value } };
    }
    return { error: friendlySiteSettingsError(readError.message) };
  }

  if (existing) {
    // Vorhandene Zeile: value updaten; id nur setzen wenn Spalte leer/null
    const patch: Record<string, unknown> = { value, updated_at };
    const existingId = (existing as { id?: string | null }).id;
    if (!existingId) patch.id = id;

    const { data, error } = await supabase
      .from("site_settings")
      .update(patch)
      .eq("key", key)
      .select("value")
      .maybeSingle();

    if (error) {
      if (isMissingIdColumn(error.message) && "id" in patch) {
        const retry = await supabase
          .from("site_settings")
          .update({ value, updated_at })
          .eq("key", key)
          .select("value")
          .maybeSingle();
        if (retry.error) {
          return { error: friendlySiteSettingsError(retry.error.message) };
        }
        return { data: retry.data ?? { value } };
      }
      return { error: friendlySiteSettingsError(error.message) };
    }
    return { data: data ?? { value } };
  }

  // Neu anlegen — immer mit UUID-id
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
  if (isMissingIdColumn(msg)) {
    const insertKeyOnly = await supabase
      .from("site_settings")
      .insert(base)
      .select("value")
      .maybeSingle();
    if (insertKeyOnly.error) {
      return { error: friendlySiteSettingsError(insertKeyOnly.error.message) };
    }
    return { data: insertKeyOnly.data ?? { value } };
  }

  // Upsert-Fallback (Race / unique)
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

  // Letzter Versuch: PostgREST-Upsert mit onConflict=key inkl. id
  const upsert = await supabase
    .from("site_settings")
    .upsert(withId, { onConflict: "key" })
    .select("value")
    .maybeSingle();
  if (!upsert.error) {
    return { data: upsert.data ?? { value } };
  }
  if (isMissingIdColumn(upsert.error.message)) {
    const upsertKey = await supabase
      .from("site_settings")
      .upsert(base, { onConflict: "key" })
      .select("value")
      .maybeSingle();
    if (upsertKey.error) {
      return { error: friendlySiteSettingsError(upsertKey.error.message) };
    }
    return { data: upsertKey.data ?? { value } };
  }

  return { error: friendlySiteSettingsError(upsert.error.message || msg) };
}
