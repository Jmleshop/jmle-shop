"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, Images, Building2, PanelsTopLeft } from "lucide-react";
import ImageUpload from "@/components/admin/ImageUpload";
import { useAdminI18n } from "@/components/admin/AdminI18n";
import { Button } from "@/components/ui";

type Tab = "banner1" | "brands" | "banner2";

type SlideRow = {
  id: string;
  image: string;
  title?: string;
  subtitle?: string;
  title_ar?: string | null;
  title_de?: string | null;
  subtitle_ar?: string | null;
  subtitle_de?: string | null;
  link_url?: string | null;
  link_category_id?: string | null;
  slider_zone?: string;
  sort_order?: number;
  active?: boolean;
};

type BrandRow = {
  id: string;
  name: string;
  image: string;
  link_url?: string | null;
  sort_order?: number;
  active?: boolean;
};

type CatOption = { id: string; name_de: string; name_ar: string };

const emptySlide = (): Omit<SlideRow, "id"> & { id?: string } => ({
  image: "",
  title_ar: "",
  title_de: "",
  subtitle_ar: "",
  subtitle_de: "",
  link_url: "",
  link_category_id: "",
  sort_order: 0,
  active: true,
});

export default function AdminSlidersPage() {
  const { t, lang } = useAdminI18n();
  const [tab, setTab] = useState<Tab>("banner1");
  const [slides, setSlides] = useState<SlideRow[]>([]);
  const [logos, setLogos] = useState<BrandRow[]>([]);
  const [categories, setCategories] = useState<CatOption[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptySlide());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [brandForm, setBrandForm] = useState({
    id: "",
    name: "",
    image: "",
    link_url: "",
  });

  const loadSlides = useCallback(async (zone: "banner1" | "banner2") => {
    const res = await fetch(`/api/admin/slides?zone=${zone}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Fehler");
      return;
    }
    setSlides(data.slides ?? []);
  }, []);

  const loadLogos = useCallback(async () => {
    const res = await fetch("/api/admin/brands");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || data.hint || "Fehler");
      return;
    }
    setLogos(data.logos ?? []);
    if (data.hint) setError(data.hint);
  }, []);

  const loadCategories = useCallback(async () => {
    const res = await fetch("/api/admin/categories");
    const data = await res.json();
    if (res.ok) {
      setCategories(
        ((data.categories ?? []) as CatOption[]).filter(
          (c) => !(c as { deleted_at?: string | null }).deleted_at
        )
      );
    }
  }, []);

  useEffect(() => {
    setError("");
    setForm(emptySlide());
    setEditingId(null);
    setBrandForm({ id: "", name: "", image: "", link_url: "" });
    if (tab === "brands") void loadLogos();
    else void loadSlides(tab);
    void loadCategories();
  }, [tab, loadLogos, loadSlides, loadCategories]);

  const saveSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const zone = tab === "banner2" ? "banner2" : "banner1";
    const res = await fetch("/api/admin/slides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        id: editingId || form.id,
        slider_zone: zone,
        sort_order: editingId
          ? form.sort_order
          : slides.length,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Fehler");
      return;
    }
    setForm(emptySlide());
    setEditingId(null);
    await loadSlides(zone);
  };

  const editSlide = (s: SlideRow) => {
    setEditingId(s.id);
    setForm({
      id: s.id,
      image: s.image,
      title_ar: s.title_ar || s.title || "",
      title_de: s.title_de || "",
      subtitle_ar: s.subtitle_ar || s.subtitle || "",
      subtitle_de: s.subtitle_de || "",
      link_url: s.link_url || "",
      link_category_id: s.link_category_id || "",
      sort_order: s.sort_order ?? 0,
      active: s.active !== false,
    });
  };

  const deleteSlide = async (id: string) => {
    if (!confirm(lang === "de" ? "Banner löschen?" : "حذف اللافتة؟")) return;
    await fetch(`/api/admin/slides?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    await loadSlides(tab === "banner2" ? "banner2" : "banner1");
  };

  const moveSlide = async (id: string, dir: -1 | 1) => {
    const idx = slides.findIndex((s) => s.id === id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= slides.length) return;
    const next = [...slides];
    const tmp = next[idx];
    next[idx] = next[j];
    next[j] = tmp;
    setSlides(next);
    await fetch("/api/admin/slides", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order: next.map((s, i) => ({ id: s.id, sort_order: i })),
      }),
    });
  };

  const saveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...brandForm,
        id: brandForm.id || undefined,
        sort_order: brandForm.id
          ? logos.find((l) => l.id === brandForm.id)?.sort_order ?? 0
          : logos.length,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || data.hint || "Fehler");
      return;
    }
    setBrandForm({ id: "", name: "", image: "", link_url: "" });
    await loadLogos();
  };

  const deleteBrand = async (id: string) => {
    if (!confirm(lang === "de" ? "Logo löschen?" : "حذف الشعار؟")) return;
    await fetch(`/api/admin/brands?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    await loadLogos();
  };

  const tabs: { id: Tab; icon: typeof Images; label: string }[] = [
    { id: "banner1", icon: PanelsTopLeft, label: t("sliderBanner1") },
    { id: "brands", icon: Building2, label: t("sliderBrands") },
    { id: "banner2", icon: Images, label: t("sliderBanner2") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-luxury-ink">{t("sliders")}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {lang === "de"
            ? "Banner 1, Marken-Logos und Banner 2 für die Startseite verwalten."
            : "إدارة اللافتات وشعارات العلامات على الصفحة الرئيسية."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium min-h-11 transition-colors ${
              tab === id
                ? "bg-brand-orange text-white shadow-gold-sm"
                : "bg-white border border-orange-100 text-luxury-charcoal hover:border-brand-orange"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-brand-red bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {tab !== "brands" ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <form onSubmit={saveSlide} className="card-boutique p-4 sm:p-5 space-y-3">
            <h2 className="font-medium text-luxury-ink">
              {editingId
                ? lang === "de"
                  ? "Banner bearbeiten"
                  : "تعديل اللافتة"
                : lang === "de"
                  ? "Neues Banner"
                  : "لافتة جديدة"}
            </h2>
            <ImageUpload
              value={form.image || ""}
              onChange={(url) =>
                setForm((f) => ({ ...f, image: typeof url === "string" ? url : url[0] || "" }))
              }
              folder="banners"
            />
            <input
              className="input-field"
              dir="rtl"
              placeholder={t("nameAr")}
              value={form.title_ar || ""}
              onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
            />
            <input
              className="input-field"
              placeholder={t("nameDe")}
              value={form.title_de || ""}
              onChange={(e) => setForm({ ...form, title_de: e.target.value })}
            />
            <input
              className="input-field"
              dir="rtl"
              placeholder={lang === "de" ? "Untertitel (AR)" : "العنوان الفرعي"}
              value={form.subtitle_ar || ""}
              onChange={(e) => setForm({ ...form, subtitle_ar: e.target.value })}
            />
            <input
              className="input-field"
              placeholder={lang === "de" ? "Untertitel (DE)" : "العنوان الفرعي DE"}
              value={form.subtitle_de || ""}
              onChange={(e) => setForm({ ...form, subtitle_de: e.target.value })}
            />
            <input
              className="input-field"
              placeholder={lang === "de" ? "Link-URL (optional)" : "رابط (اختياري)"}
              value={form.link_url || ""}
              onChange={(e) => setForm({ ...form, link_url: e.target.value })}
            />
            <select
              className="input-field"
              value={form.link_category_id || ""}
              onChange={(e) =>
                setForm({ ...form, link_category_id: e.target.value })
              }
            >
              <option value="">
                {lang === "de" ? "— Kategorie-Link —" : "— رابط فئة —"}
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_de || c.name_ar}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving || !form.image}>
                <Plus size={16} />
                {saving ? t("saving") : t("save")}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptySlide());
                  }}
                >
                  {lang === "de" ? "Abbrechen" : "إلغاء"}
                </Button>
              )}
            </div>
          </form>

          <div className="space-y-3">
            {slides.length === 0 && (
              <p className="text-sm text-gray-500">
                {lang === "de" ? "Noch keine Banner." : "لا توجد لافتات بعد."}
              </p>
            )}
            {slides.map((s, i) => (
              <div
                key={s.id}
                className="card-boutique p-3 flex gap-3 items-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.image}
                  alt=""
                  className="w-24 h-14 object-cover rounded-lg bg-orange-50"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {s.title_de || s.title_ar || s.title || s.id}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {s.link_category_id
                      ? `→ /categories/${s.link_category_id}`
                      : s.link_url || "—"}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    className="p-2 min-h-10 min-w-10 text-gray-400 hover:text-brand-orange"
                    onClick={() => void moveSlide(s.id, -1)}
                    disabled={i === 0}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    className="p-2 min-h-10 min-w-10 text-gray-400 hover:text-brand-orange"
                    onClick={() => void moveSlide(s.id, 1)}
                    disabled={i === slides.length - 1}
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>
                <button
                  type="button"
                  className="text-sm text-brand-orange px-2"
                  onClick={() => editSlide(s)}
                >
                  {t("edit")}
                </button>
                <button
                  type="button"
                  className="p-2 text-brand-red"
                  onClick={() => void deleteSlide(s.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <form onSubmit={saveBrand} className="card-boutique p-4 sm:p-5 space-y-3">
            <h2 className="font-medium text-luxury-ink">
              {brandForm.id
                ? lang === "de"
                  ? "Logo bearbeiten"
                  : "تعديل الشعار"
                : lang === "de"
                  ? "Marken-Logo hinzufügen"
                  : "إضافة شعار علامة"}
            </h2>
            <p className="text-xs text-gray-500">
              {lang === "de"
                ? "PNG mit transparentem Hintergrund empfohlen."
                : "يُفضّل PNG بخلفية شفافة."}
            </p>
            <ImageUpload
              value={brandForm.image}
              onChange={(url) =>
                setBrandForm((f) => ({
                  ...f,
                  image: typeof url === "string" ? url : url[0] || "",
                }))
              }
              folder="brands"
            />
            <input
              className="input-field"
              placeholder={lang === "de" ? "Markenname" : "اسم العلامة"}
              value={brandForm.name}
              onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
            />
            <input
              className="input-field"
              placeholder={lang === "de" ? "Link (optional)" : "رابط (اختياري)"}
              value={brandForm.link_url}
              onChange={(e) =>
                setBrandForm({ ...brandForm, link_url: e.target.value })
              }
            />
            <Button type="submit" disabled={saving || !brandForm.image}>
              <Plus size={16} />
              {saving ? t("saving") : t("save")}
            </Button>
          </form>

          <div className="space-y-3">
            {logos.length === 0 && (
              <p className="text-sm text-gray-500">
                {lang === "de" ? "Noch keine Logos." : "لا توجد شعارات بعد."}
              </p>
            )}
            {logos.map((l) => (
              <div
                key={l.id}
                className="card-boutique p-3 flex gap-3 items-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={l.image}
                  alt={l.name}
                  className="w-20 h-12 object-contain rounded-lg bg-white"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{l.name || l.id}</p>
                </div>
                <button
                  type="button"
                  className="text-sm text-brand-orange px-2"
                  onClick={() =>
                    setBrandForm({
                      id: l.id,
                      name: l.name,
                      image: l.image,
                      link_url: l.link_url || "",
                    })
                  }
                >
                  {t("edit")}
                </button>
                <button
                  type="button"
                  className="p-2 text-brand-red"
                  onClick={() => void deleteBrand(l.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
