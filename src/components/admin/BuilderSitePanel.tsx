"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import ImageUpload from "@/components/admin/ImageUpload";
import { useAdminI18n } from "@/components/admin/AdminI18n";

/**
 * Sofort speicherbare Site-Identität: Logo, Shop-Name, Slogan.
 */
export default function BuilderSitePanel({
  de,
  onSaved,
}: {
  de: boolean;
  onSaved?: () => void;
}) {
  const { t } = useAdminI18n();
  const [logo, setLogo] = useState("");
  const [name, setName] = useState("jmle");
  const [tagline, setTagline] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setError("");
    const res = await fetch("/api/admin/site");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Fehler");
      return;
    }
    const site = data.site ?? {};
    setLogo(String(data.logo || site.logo || ""));
    setName(String(site.name || "jmle"));
    setTagline(String(site.tagline || ""));
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/site", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo, name, tagline }),
      });
      const data = await res.json().catch(() => ({}));
      setSaving(false);
      if (!res.ok) {
        const message =
          typeof data.error === "string" && data.error.trim()
            ? data.error
            : de
              ? "Site-Einstellungen konnten nicht gespeichert werden."
              : "تعذّر حفظ إعدادات الموقع.";
        setError(message);
        toast.error(message);
        return;
      }
      setLogo(String(data.logo || data.site?.logo || logo));
      toast.success(de ? "Gespeichert (live)" : "تم الحفظ (مباشر)");
      onSaved?.();
    } catch {
      setSaving(false);
      const clean = de
        ? "Netzwerkfehler beim Speichern."
        : "خطأ في الشبكة أثناء الحفظ.";
      setError(clean);
      toast.error(clean);
    }
  };

  if (!loaded) {
    return (
      <p className="text-[11px] text-zinc-500">
        {de ? "Laden…" : "جاري التحميل…"}
      </p>
    );
  }

  return (
    <section className="space-y-4">
      <p className="text-[11px] leading-relaxed text-zinc-500">
        {de
          ? "Logo, Name und Slogan werden sofort im Shop gespeichert."
          : "يُحفظ الشعار والاسم والشعار النصي مباشرة في المتجر."}
      </p>
      {error ? (
        <p className="rounded-md bg-red-50 px-2.5 py-2 text-[11px] text-red-600">
          {error}
        </p>
      ) : null}
      <div>
        <h3 className="text-xs font-medium text-zinc-800 mb-1">
          {t("siteLogo")}
        </h3>
        <p className="text-[10px] text-zinc-500 mb-2">{t("siteLogoHint")}</p>
        <ImageUpload
          value={logo}
          onChange={(url) =>
            setLogo(typeof url === "string" ? url : url[0] ?? "")
          }
          folder="brand"
          multiple={false}
          enableEditor={false}
          label={t("siteLogo")}
        />
      </div>
      <label className="block text-xs">
        <span className="text-zinc-600">{t("shopName")}</span>
        <input
          className="mt-1 h-9 w-full rounded-md border border-zinc-200 px-2.5 text-xs outline-none focus:border-zinc-400"
          value={name}
          onChange={(e) => setName(e.target.value)}
          dir="rtl"
        />
      </label>
      <label className="block text-xs">
        <span className="text-zinc-600">{t("shopTagline")}</span>
        <input
          className="mt-1 h-9 w-full rounded-md border border-zinc-200 px-2.5 text-xs outline-none focus:border-zinc-400"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          dir="rtl"
        />
      </label>
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-zinc-900 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {saving ? t("saving") : de ? "Sofort speichern" : "حفظ فوري"}
      </button>
    </section>
  );
}
