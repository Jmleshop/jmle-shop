"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Plus,
  Trash2,
  Images,
  Building2,
  PanelsTopLeft,
  LayoutTemplate,
  Eye,
  EyeOff,
} from "lucide-react";
import ImageUpload from "@/components/admin/ImageUpload";
import { useAdminI18n } from "@/components/admin/AdminI18n";
import { Button } from "@/components/ui";

type Tab = "banner1" | "brands" | "banner2" | "banner3" | "settings";

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
  media_type?: string | null;
  video_url?: string | null;
  product_id?: string | null;
  interactive_style?: string | null;
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

type SiteForm = {
  brandsSectionTitle: string;
  banner2SectionTitle: string;
  banner3SectionTitle: string;
  categoriesSectionTitle: string;
  zoneLabels: {
    banner1: string;
    brands: string;
    banner2: string;
    banner3: string;
  };
};

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
  media_type: "image",
  video_url: "",
  product_id: "",
  interactive_style: "",
});

const defaultSite = (): SiteForm => ({
  brandsSectionTitle: "",
  banner2SectionTitle: "",
  banner3SectionTitle: "",
  categoriesSectionTitle: "",
  zoneLabels: {
    banner1: "Hero Banner 1",
    brands: "Marken-Logos",
    banner2: "Banner 2",
    banner3: "Banner 3",
  },
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
    active: true,
  });
  const [site, setSite] = useState<SiteForm>(defaultSite());

  const zoneLabel = (key: keyof SiteForm["zoneLabels"]) =>
    site.zoneLabels[key]?.trim() ||
    (key === "banner1"
      ? t("sliderBanner1")
      : key === "brands"
        ? t("sliderBrands")
        : key === "banner2"
          ? t("sliderBanner2")
          : t("sliderBanner3"));

  const loadSlides = useCallback(async (zone: "banner1" | "banner2" | "banner3") => {
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

  const loadSite = useCallback(async () => {
    const res = await fetch("/api/admin/site");
    const data = await res.json();
    if (!res.ok) return;
    const s = data.site ?? {};
    setSite({
      brandsSectionTitle: s.brandsSectionTitle ?? "",
      banner2SectionTitle: s.banner2SectionTitle ?? "",
      banner3SectionTitle: s.banner3SectionTitle ?? "",
      categoriesSectionTitle: s.categoriesSectionTitle ?? "",
      zoneLabels: {
        banner1: s.zoneLabels?.banner1 || "Hero Banner 1",
        brands: s.zoneLabels?.brands || "Marken-Logos",
        banner2: s.zoneLabels?.banner2 || "Banner 2",
        banner3: s.zoneLabels?.banner3 || "Banner 3",
      },
    });
  }, []);

  useEffect(() => {
    setError("");
    setForm(emptySlide());
    setEditingId(null);
    setBrandForm({ id: "", name: "", image: "", link_url: "", active: true });
    void loadSite();
    void loadCategories();
    if (tab === "brands") void loadLogos();
    else if (tab === "settings") return;
    else void loadSlides(tab);
  }, [tab, loadLogos, loadSlides, loadCategories, loadSite]);

  const saveSite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/site", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(site),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Fehler");
      return;
    }
  };

  const saveSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const zone = tab === "banner2" || tab === "banner3" ? tab : "banner1";
    const res = await fetch("/api/admin/slides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        id: editingId || form.id,
        slider_zone: zone,
        sort_order: editingId ? form.sort_order : slides.length,
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
      media_type: s.media_type || "image",
      video_url: s.video_url || "",
      product_id: s.product_id || "",
      interactive_style: s.interactive_style || "",
    });
  };

  const toggleSlideActive = async (s: SlideRow) => {
    await fetch("/api/admin/slides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...s,
        active: s.active === false,
        title_ar: s.title_ar || s.title || "",
        title_de: s.title_de || "",
      }),
    });
    if (tab === "banner1" || tab === "banner2" || tab === "banner3") {
      await loadSlides(tab);
    }
  };

  const deleteSlide = async (id: string) => {
    if (!confirm(lang === "de" ? "Banner löschen?" : "حذف اللافتة؟")) return;
    await fetch(`/api/admin/slides?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (tab === "banner1" || tab === "banner2" || tab === "banner3") {
      await loadSlides(tab);
    }
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
    setBrandForm({ id: "", name: "", image: "", link_url: "", active: true });
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
    { id: "banner1", icon: PanelsTopLeft, label: zoneLabel("banner1") },
    { id: "brands", icon: Building2, label: zoneLabel("brands") },
    { id: "banner2", icon: Images, label: zoneLabel("banner2") },
    { id: "banner3", icon: LayoutTemplate, label: zoneLabel("banner3") },
    {
      id: "settings",
      icon: PanelsTopLeft,
      label: lang === "de" ? "Titel & Namen" : "العناوين والأسماء",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-luxury-ink">{t("sliders")}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {lang === "de"
            ? "Hero Banner 1, Marken-Logos, Banner 2 & Banner 3 — aktivieren, sortieren, verlinken und benennen."
            : "إدارة اللافتات وشعارات العلامات: تفعيل، ترتيب، ربط وإعادة تسمية."}
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

      {tab === "settings" ? (
        <form onSubmit={saveSite} className="card-boutique p-4 sm:p-5 space-y-4 max-w-2xl">
          <h2 className="font-medium text-luxury-ink">{t("zoneRename")}</h2>
          {(
            [
              ["banner1", "banner1"],
              ["brands", "brands"],
              ["banner2", "banner2"],
              ["banner3", "banner3"],
            ] as const
          ).map(([key]) => (
            <div key={key}>
              <label className="block text-xs text-gray-500 mb-1">{key}</label>
              <input
                className="input-field"
                value={site.zoneLabels[key]}
                onChange={(e) =>
                  setSite((s) => ({
                    ...s,
                    zoneLabels: { ...s.zoneLabels, [key]: e.target.value },
                  }))
                }
              />
            </div>
          ))}
          <h2 className="font-medium text-luxury-ink pt-2">{t("sectionTitle")}</h2>
          <p className="text-xs text-gray-500">
            {lang === "de"
              ? "Leer lassen = keine Überschrift und kein Extra-Abstand auf der Startseite."
              : "اتركه فارغاً = بدون عنوان وبدون مسافة إضافية."}
          </p>
          <input
            className="input-field"
            placeholder={zoneLabel("brands")}
            value={site.brandsSectionTitle}
            onChange={(e) => setSite({ ...site, brandsSectionTitle: e.target.value })}
          />
          <input
            className="input-field"
            placeholder={zoneLabel("banner2")}
            value={site.banner2SectionTitle}
            onChange={(e) => setSite({ ...site, banner2SectionTitle: e.target.value })}
          />
          <input
            className="input-field"
            placeholder={zoneLabel("banner3")}
            value={site.banner3SectionTitle}
            onChange={(e) => setSite({ ...site, banner3SectionTitle: e.target.value })}
          />
          <input
            className="input-field"
            placeholder={t("categoriesSectionTitle")}
            value={site.categoriesSectionTitle}
            onChange={(e) =>
              setSite({ ...site, categoriesSectionTitle: e.target.value })
            }
          />
          <Button type="submit" disabled={saving}>
            {saving ? t("saving") : t("save")}
          </Button>
        </form>
      ) : tab !== "brands" ? (
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
            <select
              className="input-field"
              value={form.media_type || "image"}
              onChange={(e) => setForm({ ...form, media_type: e.target.value })}
            >
              <option value="image">{lang === "de" ? "Bild" : "صورة"}</option>
              <option value="video">{lang === "de" ? "Produkt-Video / Reel" : "فيديو / ريل"}</option>
              <option value="parallax">{lang === "de" ? "Parallax-Banner" : "بانر متوازي"}</option>
              <option value="product_card">
                {lang === "de" ? "Animierte Produkt-Karte" : "بطاقة منتج متحركة"}
              </option>
            </select>
            {(form.media_type === "video" || form.media_type === "product_card") && (
              <input
                className="input-field"
                placeholder={t("videoUrl")}
                value={form.video_url || ""}
                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
              />
            )}
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
            <label className="flex items-center gap-2 text-sm min-h-11">
              <input
                type="checkbox"
                checked={form.active !== false}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="w-4 h-4 accent-brand-orange"
              />
              {t("active")}
            </label>
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
                    {s.media_type && s.media_type !== "image"
                      ? `${s.media_type} · `
                      : ""}
                    {s.link_category_id
                      ? `→ /categories/${s.link_category_id}`
                      : s.link_url || "—"}
                    {s.active === false ? ` · ${t("inactive")}` : ""}
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
                  className="p-2 text-gray-500 hover:text-brand-orange"
                  onClick={() => void toggleSlideActive(s)}
                  title={s.active === false ? t("active") : t("inactive")}
                >
                  {s.active === false ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
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
                ? "PNG mit transparentem Hintergrund empfohlen. Logos erscheinen in Originalfarben."
                : "يُفضّل PNG بخلفية شفافة. تظهر الشعارات بألوانها الأصلية."}
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
                  className="w-20 h-12 object-contain rounded-lg bg-transparent"
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
                      active: l.active !== false,
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
