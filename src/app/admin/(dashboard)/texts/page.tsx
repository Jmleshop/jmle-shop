"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAdminI18n } from "@/components/admin/AdminI18n";
import {
  AdminError,
  AdminLoading,
  AdminPageHeader,
} from "@/components/admin/AdminState";
import { Button } from "@/components/ui";
import {
  SHOP_TEXT_MAX_LENGTH,
  shopTextCatalog,
  type ShopMsgKey,
} from "@/lib/shop-i18n";

/** Arabische Shop-Texte bearbeiten — gespeichert als site.shopTexts. */
export default function AdminShopTextsPage() {
  const { t, lang } = useAdminI18n();
  const catalog = useMemo(() => shopTextCatalog(), []);
  const [values, setValues] = useState<Partial<Record<ShopMsgKey, string>>>({});
  const [saved, setSaved] = useState<Partial<Record<ShopMsgKey, string>>>({});
  const [query, setQuery] = useState("");
  const [onlyChanged, setOnlyChanged] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/admin/site");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "load");
      const texts = (data.site?.shopTexts ?? {}) as Partial<Record<ShopMsgKey, string>>;
      setValues(texts);
      setSaved(texts);
      setLoaded(true);
    } catch {
      setError(t("loadFailed"));
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = JSON.stringify(values) !== JSON.stringify(saved);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((row) => {
      if (onlyChanged && !values[row.key]?.trim()) return false;
      if (!q) return true;
      return [row.key, row.ar, row.de, values[row.key] ?? ""].some((v) =>
        v.toLowerCase().includes(q)
      );
    });
  }, [catalog, query, onlyChanged, values]);

  const setValue = (key: ShopMsgKey, text: string) => {
    setValues((prev) => {
      const next = { ...prev };
      if (text) next[key] = text;
      else delete next[key];
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/site", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopTexts: values }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "save");
      const texts = (data.site?.shopTexts ?? values) as Partial<Record<ShopMsgKey, string>>;
      setValues(texts);
      setSaved(texts);
      toast.success(lang === "de" ? "Gespeichert — im Shop nach dem Neuladen sichtbar" : "تم الحفظ");
    } catch (e) {
      const message =
        e instanceof Error && e.message !== "save"
          ? e.message
          : lang === "de"
            ? "Speichern fehlgeschlagen."
            : "فشل الحفظ.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (error) return <AdminError message={error} onRetry={() => void load()} />;
  if (!loaded) return <AdminLoading />;

  const changedCount = Object.keys(values).length;

  return (
    <div className="max-w-4xl mx-auto">
      <AdminPageHeader
        title={t("shopTexts")}
        description={t("shopTextsHint")}
        actions={
          <Button type="button" onClick={() => void save()} disabled={saving || !dirty}>
            {saving ? t("saving") : t("save")}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="relative flex-1 min-w-[14rem]">
          <Search
            size={16}
            aria-hidden
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="search"
            className="input-field ps-9"
            placeholder={lang === "de" ? "Text suchen (Arabisch oder Deutsch)…" : "ابحث عن نص…"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="inline-flex min-h-11 items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            className="h-4 w-4 accent-brand-orange"
            checked={onlyChanged}
            onChange={(e) => setOnlyChanged(e.target.checked)}
          />
          {lang === "de" ? `Nur geänderte (${changedCount})` : `المعدّلة فقط (${changedCount})`}
        </label>
      </div>

      <ul className="space-y-2">
        {rows.map((row) => {
          const value = values[row.key] ?? "";
          const multiline = row.ar.length > 60;
          const inputProps = {
            dir: "rtl" as const,
            className: "input-field w-full",
            placeholder: row.ar,
            maxLength: SHOP_TEXT_MAX_LENGTH,
            value,
            "aria-label": row.de,
          };
          return (
            <li
              key={row.key}
              className={`rounded-xl border bg-white p-3 ${
                value ? "border-brand-orange/50" : "border-gray-100"
              }`}
            >
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                <span>
                  <span className="font-medium text-gray-700">{row.de}</span>
                  <span className="ms-2 font-mono text-[10px] text-gray-400">{row.key}</span>
                </span>
                {value ? (
                  <button
                    type="button"
                    onClick={() => setValue(row.key, "")}
                    className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  >
                    <RotateCcw size={12} aria-hidden />
                    {lang === "de" ? "Standard" : "افتراضي"}
                  </button>
                ) : null}
              </div>
              {multiline ? (
                <textarea
                  {...inputProps}
                  rows={2}
                  onChange={(e) => setValue(row.key, e.target.value)}
                />
              ) : (
                <input {...inputProps} onChange={(e) => setValue(row.key, e.target.value)} />
              )}
            </li>
          );
        })}
      </ul>

      {dirty ? (
        <div className="sticky bottom-4 mt-6 flex justify-end">
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? t("saving") : t("save")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
