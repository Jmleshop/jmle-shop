"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, ImageOff, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "react-hot-toast";
import ImageUpload from "@/components/admin/ImageUpload";
import { useAdminI18n } from "@/components/admin/AdminI18n";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
} from "@/components/admin/AdminState";
import { Button } from "@/components/ui";
import { vercelOptimizedImageSrc } from "@/lib/sharp-image";
import { hasBrandLogo } from "@/lib/brand-link";

type BrandRow = {
  id: string;
  name: string;
  image: string;
  link_url: string | null;
  sort_order: number | null;
  active: boolean | null;
};

type BrandForm = {
  id: string;
  name: string;
  image: string;
  link_url: string;
  active: boolean;
};

const EMPTY_FORM: BrandForm = { id: "", name: "", image: "", link_url: "", active: true };

/** Marken-Logos mit Namen auf einen Blick bearbeiten (Tabelle brand_logos). */
export default function AdminBrandsPage() {
  const { t, lang } = useAdminI18n();
  const de = lang === "de";
  const [logos, setLogos] = useState<BrandRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<BrandForm | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/admin/brands");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "load");
      setLogos((data.logos ?? []) as BrandRow[]);
      setLoaded(true);
    } catch {
      setError(t("loadFailed"));
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const edit = (row: BrandRow) => setForm(toForm(row));

  const save = async (next: BrandForm) => {
    setSaving(true);
    try {
      const existing = logos.find((l) => l.id === next.id);
      const res = await fetch("/api/admin/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...next,
          id: next.id || undefined,
          sort_order: existing ? existing.sort_order ?? 0 : logos.length,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          res.status === 409
            ? de
              ? "Dieser Markenname existiert bereits"
              : String(data.errorAr || "اسم العلامة التجارية موجود بالفعل")
            : data.error || (de ? "Speichern fehlgeschlagen" : "فشل الحفظ");
        toast.error(message);
        return false;
      }
      toast.success(de ? "Gespeichert" : "تم الحفظ");
      await load();
      return true;
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: BrandRow) => {
    if (!confirm(de ? `Marke „${row.name}“ löschen?` : `حذف العلامة «${row.name}»؟`)) return;
    const res = await fetch(`/api/admin/brands?id=${encodeURIComponent(row.id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error(
        res.status === 403
          ? de
            ? "Nur Administratoren dürfen Marken löschen."
            : "الحذف متاح للمسؤولين فقط."
          : de
            ? "Löschen fehlgeschlagen"
            : "فشل الحذف"
      );
      return;
    }
    if (form?.id === row.id) setForm(null);
    await load();
  };

  if (error) return <AdminError message={error} onRetry={() => void load()} />;
  if (!loaded) return <AdminLoading />;

  return (
    <div className="max-w-6xl mx-auto">
      <AdminPageHeader
        title={t("brandsAdmin")}
        description={t("brandsAdminHint")}
        actions={
          <Button type="button" onClick={() => setForm({ ...EMPTY_FORM })}>
            <Plus size={16} aria-hidden />
            {de ? "Neue Marke" : "علامة جديدة"}
          </Button>
        }
      />

      {form ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (await save(form)) setForm(null);
          }}
          className="card-boutique mb-6 grid gap-5 p-4 sm:p-5 md:grid-cols-[minmax(0,18rem)_1fr]"
        >
          <div>
            <ImageUpload
              value={form.image}
              onChange={(url) =>
                setForm((f) =>
                  f ? { ...f, image: typeof url === "string" ? url : url[0] || "" } : f
                )
              }
              folder="brands"
              multiple={false}
              enableEditor
              label={de ? "Logo (PNG mit transparentem Hintergrund)" : "الشعار (PNG بخلفية شفافة)"}
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-medium text-luxury-ink">
                {form.id ? (de ? "Marke bearbeiten" : "تعديل العلامة") : de ? "Neue Marke" : "علامة جديدة"}
              </h2>
              <button
                type="button"
                onClick={() => setForm(null)}
                aria-label={de ? "Schließen" : "إغلاق"}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs text-gray-500">
                {de ? "Markenname" : "اسم العلامة"}
              </span>
              <input
                className="input-field"
                required
                value={form.name}
                placeholder={de ? "z. B. Durra" : "مثال: Durra"}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-gray-500">
                {de ? "Link (optional)" : "رابط (اختياري)"}
              </span>
              <input
                className="input-field"
                dir="ltr"
                value={form.link_url}
                onChange={(e) => setForm({ ...form, link_url: e.target.value })}
              />
            </label>
            <label className="inline-flex min-h-11 items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand-orange"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              {de ? "Im Shop anzeigen" : "إظهار في المتجر"}
            </label>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={saving || !hasBrandLogo(form.image) || !form.name.trim()}>
                {saving ? t("saving") : t("save")}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setForm(null)}>
                {de ? "Abbrechen" : "إلغاء"}
              </Button>
            </div>
          </div>
        </form>
      ) : null}

      {logos.length === 0 ? (
        <AdminEmpty>{de ? "Noch keine Marken." : "لا توجد علامات بعد."}</AdminEmpty>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {logos.map((row) => {
            const hidden = row.active === false;
            const selected = form?.id === row.id;
            return (
              <li
                key={row.id}
                className={`card-boutique flex flex-col overflow-hidden ${
                  selected ? "ring-2 ring-brand-orange" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => edit(row)}
                  className="relative flex h-32 items-center justify-center bg-[repeating-conic-gradient(#f5f5f4_0%_25%,#fff_0%_50%)] bg-[length:16px_16px] p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-orange"
                  aria-label={de ? `${row.name} bearbeiten` : `تعديل ${row.name}`}
                >
                  {hasBrandLogo(row.image) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={vercelOptimizedImageSrc(row.image, 256)}
                      alt=""
                      className={`max-h-full max-w-full object-contain ${hidden ? "opacity-40" : ""}`}
                    />
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
                      <ImageOff size={14} aria-hidden />
                      {de ? "Kein Logo — im Shop ausgeblendet" : "لا يوجد شعار — مخفي في المتجر"}
                    </span>
                  )}
                  {hidden ? (
                    <span className="absolute top-2 start-2 inline-flex items-center gap-1 rounded-full bg-gray-800/80 px-2 py-0.5 text-[10px] text-white">
                      <EyeOff size={10} aria-hidden />
                      {de ? "Ausgeblendet" : "مخفي"}
                    </span>
                  ) : null}
                </button>
                <p
                  className="truncate border-t border-gray-100 px-3 pt-2 text-sm font-semibold text-luxury-ink"
                  title={row.name}
                >
                  {row.name || row.id}
                </p>
                <div className="flex items-center justify-end gap-1 px-2 pb-2">
                  <button
                    type="button"
                    onClick={() => void save({ ...toForm(row), active: hidden })}
                    title={hidden ? (de ? "Einblenden" : "إظهار") : de ? "Ausblenden" : "إخفاء"}
                    aria-label={hidden ? (de ? "Einblenden" : "إظهار") : de ? "Ausblenden" : "إخفاء"}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
                  >
                    {hidden ? <Eye size={16} aria-hidden /> : <EyeOff size={16} aria-hidden />}
                  </button>
                  <button
                    type="button"
                    onClick={() => edit(row)}
                    aria-label={t("edit")}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-brand-orange"
                  >
                    <Pencil size={16} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(row)}
                    aria-label={de ? "Löschen" : "حذف"}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-brand-red hover:bg-red-50"
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function toForm(row: BrandRow): BrandForm {
  return {
    id: row.id,
    name: row.name,
    image: row.image,
    link_url: row.link_url || "",
    active: row.active !== false,
  };
}
