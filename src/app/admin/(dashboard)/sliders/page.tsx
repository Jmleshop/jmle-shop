"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Plus,
  Trash2,
  Building2,
  LayoutTemplate,
  Eye,
  EyeOff,
  Layers,
} from "lucide-react";
import ImageUpload from "@/components/admin/ImageUpload";
import { useAdminI18n } from "@/components/admin/AdminI18n";
import { Button } from "@/components/ui";
import {
  createHomepageSection,
  normalizeHomepageSections,
} from "@/lib/homepage-sections";
import type { HomepageSection, HomepageSectionType } from "@/types";

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

const TYPE_LABELS: Record<HomepageSectionType, { de: string; ar: string }> = {
  slider: { de: "Banner-Slider", ar: "سلايدر بانر" },
  single: { de: "Einzelbanner", ar: "بانر واحد" },
  brands: { de: "Marken-Ticker", ar: "شريط العلامات" },
  products: { de: "Produkt-Grid", ar: "شبكة منتجات" },
  categories: { de: "Kategorien", ar: "الفئات" },
};

export default function AdminSlidersPage() {
  const { t, lang } = useAdminI18n();
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  const selected = useMemo(
    () => sections.find((s) => s.id === selectedId) ?? null,
    [sections, selectedId]
  );

  const typeLabel = (type: HomepageSectionType) =>
    lang === "de" ? TYPE_LABELS[type].de : TYPE_LABELS[type].ar;

  const loadSections = useCallback(async () => {
    const res = await fetch("/api/admin/site");
    const data = await res.json();
    if (!res.ok) return;
    const s = data.site ?? {};
    const normalized = normalizeHomepageSections(s.homepageSections, {
      brands: s.brandsSectionTitle,
      banner2: s.banner2SectionTitle,
      banner3: s.banner3SectionTitle,
      categories: s.categoriesSectionTitle,
    });
    setSections(normalized);
    setSelectedId((prev) => prev ?? normalized[0]?.id ?? null);
  }, []);

  const loadSlides = useCallback(async (zone: string) => {
    const res = await fetch(`/api/admin/slides?zone=${encodeURIComponent(zone)}`);
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
    void loadSections();
    void loadCategories();
  }, [loadSections, loadCategories]);

  useEffect(() => {
    setError("");
    setForm(emptySlide());
    setEditingId(null);
    setBrandForm({ id: "", name: "", image: "", link_url: "", active: true });
    if (!selected) return;
    if (selected.type === "brands") void loadLogos();
    else if (selected.type === "slider" || selected.type === "single") {
      void loadSlides(selected.zone || selected.id);
    } else {
      setSlides([]);
    }
  }, [selected, loadLogos, loadSlides]);

  const persistSections = async (next: HomepageSection[]) => {
    const ordered = next
      .map((s, i) => ({ ...s, sortOrder: i }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    setSections(ordered);
    setSaving(true);
    setError("");
    const brandsTitle =
      ordered.find((s) => s.type === "brands")?.title ?? "";
    const banner2Title =
      ordered.find((s) => s.zone === "banner2" || s.id === "sec-banner2")?.title ??
      "";
    const banner3Title =
      ordered.find((s) => s.zone === "banner3" || s.id === "sec-banner3")?.title ??
      "";
    const categoriesTitle =
      ordered.find((s) => s.type === "categories")?.title ?? "";
    const res = await fetch("/api/admin/site", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        homepageSections: ordered,
        brandsSectionTitle: brandsTitle,
        banner2SectionTitle: banner2Title,
        banner3SectionTitle: banner3Title,
        categoriesSectionTitle: categoriesTitle,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Fehler");
      return false;
    }
    return true;
  };

  const updateSelected = async (patch: Partial<HomepageSection>) => {
    if (!selected) return;
    const next = sections.map((s) =>
      s.id === selected.id ? { ...s, ...patch } : s
    );
    await persistSections(next);
  };

  const addBannerSection = async (type: "slider" | "single" = "slider") => {
    const created = createHomepageSection(type, sections.length);
    created.title = lang === "de" ? "Neue Banner-Sektion" : "قسم بانر جديد";
    const next = [...sections, created];
    const ok = await persistSections(next);
    if (ok) setSelectedId(created.id);
  };

  const addSectionOfType = async (type: HomepageSectionType) => {
    if (type === "slider" || type === "single") {
      await addBannerSection(type);
      return;
    }
    const created = createHomepageSection(type, sections.length);
    created.title =
      type === "brands"
        ? lang === "de"
          ? "Marken"
          : "العلامات"
        : type === "categories"
          ? lang === "de"
            ? "Kategorien"
            : "الفئات"
          : lang === "de"
            ? "Angebote"
            : "عروض";
    const next = [...sections, created];
    const ok = await persistSections(next);
    if (ok) setSelectedId(created.id);
  };

  const removeSection = async (id: string) => {
    if (sections.length <= 1) {
      setError(
        lang === "de"
          ? "Mindestens eine Sektion muss bleiben."
          : "يجب الإبقاء على قسم واحد على الأقل."
      );
      return;
    }
    if (
      !confirm(
        lang === "de"
          ? "Sektion von der Startseite entfernen?"
          : "إزالة القسم من الصفحة الرئيسية؟"
      )
    ) {
      return;
    }
    const next = sections.filter((s) => s.id !== id);
    const ok = await persistSections(next);
    if (ok) setSelectedId(next[0]?.id ?? null);
  };

  const moveSection = async (id: string, dir: -1 | 1) => {
    const idx = sections.findIndex((s) => s.id === id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= sections.length) return;
    const next = [...sections];
    const tmp = next[idx];
    next[idx] = next[j];
    next[j] = tmp;
    await persistSections(next);
  };

  const saveSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || (selected.type !== "slider" && selected.type !== "single")) {
      return;
    }
    setSaving(true);
    setError("");
    const zone = selected.zone || selected.id;
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
    if (!selected) return;
    const zone = selected.zone || selected.id;
    await fetch("/api/admin/slides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...s,
        active: s.active === false,
        title_ar: s.title_ar || s.title || "",
        title_de: s.title_de || "",
        slider_zone: zone,
      }),
    });
    await loadSlides(zone);
  };

  const deleteSlide = async (id: string) => {
    if (!selected) return;
    if (!confirm(lang === "de" ? "Banner löschen?" : "حذف اللافتة؟")) return;
    await fetch(`/api/admin/slides?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    await loadSlides(selected.zone || selected.id);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-luxury-ink">{t("sliders")}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {lang === "de"
            ? "Flexible Sektionen-Verwaltung: beliebig viele Banner, Marken, Kategorien und Produkt-Blöcke — Titel, Typ und Reihenfolge frei steuerbar."
            : "إدارة أقسام مرنة: عدد غير محدود من البانرات والعلامات والفئات والمنتجات — مع عنوان ونوع وترتيب حر."}
        </p>
      </div>

      {error && (
        <p className="text-sm text-brand-red bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <div className="grid xl:grid-cols-[minmax(280px,340px)_1fr] gap-6">
        {/* Sections list */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void addBannerSection("slider")}
              disabled={saving}
            >
              <Plus size={16} />
              {lang === "de"
                ? "+ Neue Banner-Sektion hinzufügen"
                : "+ إضافة قسم بانر جديد"}
            </Button>
            <div className="relative">
              <select
                className="input-field !min-h-11 py-2 text-sm"
                defaultValue=""
                onChange={(e) => {
                  const v = e.target.value as HomepageSectionType | "";
                  if (v) void addSectionOfType(v);
                  e.target.value = "";
                }}
              >
                <option value="" disabled>
                  {lang === "de" ? "Andere Sektion…" : "قسم آخر…"}
                </option>
                <option value="single">{typeLabel("single")}</option>
                <option value="brands">{typeLabel("brands")}</option>
                <option value="products">{typeLabel("products")}</option>
                <option value="categories">{typeLabel("categories")}</option>
              </select>
            </div>
          </div>

          {sections.map((section, i) => (
            <div
              key={section.id}
              className={`card-boutique p-3 flex gap-2 items-start ${
                selectedId === section.id ? "ring-2 ring-brand-orange/40" : ""
              }`}
            >
              <button
                type="button"
                className="flex-1 text-start min-w-0"
                onClick={() => setSelectedId(section.id)}
              >
                <p className="text-sm font-medium text-luxury-ink truncate">
                  {section.title?.trim() ||
                    typeLabel(section.type) ||
                    section.id}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {typeLabel(section.type)}
                  {section.zone ? ` · ${section.zone}` : ""}
                  {section.active === false
                    ? ` · ${t("inactive")}`
                    : ""}
                  {` · #${i + 1}`}
                </p>
              </button>
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  className="p-1.5 text-gray-400 hover:text-brand-orange disabled:opacity-30"
                  onClick={() => void moveSection(section.id, -1)}
                  disabled={i === 0 || saving}
                  aria-label="Up"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  className="p-1.5 text-gray-400 hover:text-brand-orange disabled:opacity-30"
                  onClick={() => void moveSection(section.id, 1)}
                  disabled={i === sections.length - 1 || saving}
                  aria-label="Down"
                >
                  <ArrowDown size={14} />
                </button>
              </div>
              <button
                type="button"
                className="p-1.5 text-brand-red"
                onClick={() => void removeSection(section.id)}
                disabled={saving}
                aria-label="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        <div className="space-y-4">
          {!selected ? (
            <p className="text-sm text-gray-500">
              {lang === "de"
                ? "Sektion auswählen oder neue Banner-Sektion hinzufügen."
                : "اختر قسماً أو أضف بانر جديد."}
            </p>
          ) : (
            <>
              <div className="card-boutique p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2 text-luxury-ink font-medium">
                  <Layers size={18} />
                  {lang === "de" ? "Sektion bearbeiten" : "تعديل القسم"}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    {t("sectionTitleAr")}
                  </label>
                  <input
                    className="input-field"
                    dir="rtl"
                    value={selected.titleAr ?? selected.title ?? ""}
                    placeholder="مثال: عروض وتخفيضات — اتركه فارغاً للإخفاء"
                    onChange={(e) => {
                      const titleAr = e.target.value;
                      setSections((list) =>
                        list.map((s) =>
                          s.id === selected.id
                            ? { ...s, titleAr, title: titleAr }
                            : s
                        )
                      );
                    }}
                    onBlur={() =>
                      void updateSelected({
                        titleAr: selected.titleAr ?? selected.title ?? "",
                        title: selected.titleAr ?? selected.title ?? "",
                      })
                    }
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    يظهر بأناقة فوق القسم كنص ويب. الحقل الفارغ يخفي العنوان تماماً.
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      {lang === "de" ? "Typ" : "النوع"}
                    </label>
                    <select
                      className="input-field"
                      value={selected.type}
                      onChange={(e) => {
                        const type = e.target.value as HomepageSectionType;
                        const patch: Partial<HomepageSection> = { type };
                        if (type === "slider" || type === "single") {
                          patch.zone = selected.zone || selected.id;
                          patch.productSource = undefined;
                        } else if (type === "products") {
                          patch.productSource = selected.productSource || "offers";
                          patch.zone = undefined;
                        } else {
                          patch.zone = undefined;
                          patch.productSource = undefined;
                        }
                        void updateSelected(patch);
                      }}
                    >
                      {(Object.keys(TYPE_LABELS) as HomepageSectionType[]).map(
                        (key) => (
                          <option key={key} value={key}>
                            {typeLabel(key)}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  {selected.type === "products" && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        {lang === "de" ? "Produktquelle" : "مصدر المنتجات"}
                      </label>
                      <select
                        className="input-field"
                        value={selected.productSource || "offers"}
                        onChange={(e) =>
                          void updateSelected({
                            productSource: e.target.value as
                              | "offers"
                              | "bestsellers"
                              | "all",
                          })
                        }
                      >
                        <option value="offers">
                          {lang === "de" ? "Angebote" : "عروض"}
                        </option>
                        <option value="bestsellers">
                          {lang === "de" ? "Bestseller" : "الأكثر مبيعاً"}
                        </option>
                        <option value="all">
                          {lang === "de" ? "Alle Produkte" : "كل المنتجات"}
                        </option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      {lang === "de" ? "Position" : "الترتيب"}
                    </label>
                    <input
                      type="number"
                      min={1}
                      className="input-field"
                      value={
                        sections.findIndex((s) => s.id === selected.id) + 1
                      }
                      onChange={(e) => {
                        const pos = Math.max(
                          1,
                          Math.min(sections.length, Number(e.target.value) || 1)
                        );
                        const idx = sections.findIndex((s) => s.id === selected.id);
                        if (idx < 0) return;
                        const next = [...sections];
                        const [item] = next.splice(idx, 1);
                        next.splice(pos - 1, 0, item);
                        void persistSections(next);
                      }}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm min-h-11">
                  <input
                    type="checkbox"
                    checked={selected.active !== false}
                    onChange={(e) =>
                      void updateSelected({ active: e.target.checked })
                    }
                    className="w-4 h-4 accent-brand-orange"
                  />
                  {t("active")}
                </label>
              </div>

              {(selected.type === "slider" || selected.type === "single") && (
                <div className="grid lg:grid-cols-2 gap-6">
                  <form
                    onSubmit={saveSlide}
                    className="card-boutique p-4 sm:p-5 space-y-3"
                  >
                    <h2 className="font-medium text-luxury-ink flex items-center gap-2">
                      <LayoutTemplate size={16} />
                      {editingId
                        ? lang === "de"
                          ? "Banner bearbeiten"
                          : "تعديل اللافتة"
                        : lang === "de"
                          ? "Neues Banner"
                          : "لافتة جديدة"}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {lang === "de"
                        ? "Titel/Untertitel optional — nur als scharfes Web-Overlay. Platzhalter wie „Banner“ werden nicht angezeigt. Sektions-Titel steht oben außerhalb des Bildes."
                        : "العنوان اختياري كنص ويب حاد. النصوص النائبة مثل Banner لا تُعرض. عنوان القسم يظهر خارج الصورة."}
                    </p>
                    <ImageUpload
                      value={form.image || ""}
                      onChange={(url) =>
                        setForm((f) => ({
                          ...f,
                          image: typeof url === "string" ? url : url[0] || "",
                        }))
                      }
                      folder="banners"
                      enableEditor
                    />
                    <select
                      className="input-field"
                      value={form.media_type || "image"}
                      onChange={(e) =>
                        setForm({ ...form, media_type: e.target.value })
                      }
                    >
                      <option value="image">
                        {lang === "de" ? "Bild" : "صورة"}
                      </option>
                      <option value="video">
                        {lang === "de" ? "Produkt-Video / Reel" : "فيديو / ريل"}
                      </option>
                      <option value="parallax">
                        {lang === "de" ? "Parallax-Banner" : "بانر متوازي"}
                      </option>
                      <option value="product_card">
                        {lang === "de"
                          ? "Animierte Produkt-Karte"
                          : "بطاقة منتج متحركة"}
                      </option>
                    </select>
                    {(form.media_type === "video" ||
                      form.media_type === "product_card") && (
                      <input
                        className="input-field"
                        placeholder={t("videoUrl")}
                        value={form.video_url || ""}
                        onChange={(e) =>
                          setForm({ ...form, video_url: e.target.value })
                        }
                      />
                    )}
                    <input
                      className="input-field"
                      dir="rtl"
                      placeholder={t("nameAr")}
                      value={form.title_ar || ""}
                      onChange={(e) =>
                        setForm({ ...form, title_ar: e.target.value })
                      }
                    />
                    <input
                      className="input-field"
                      placeholder={t("nameDe")}
                      value={form.title_de || ""}
                      onChange={(e) =>
                        setForm({ ...form, title_de: e.target.value })
                      }
                    />
                    <input
                      className="input-field"
                      dir="rtl"
                      placeholder={
                        lang === "de" ? "Untertitel (AR)" : "العنوان الفرعي"
                      }
                      value={form.subtitle_ar || ""}
                      onChange={(e) =>
                        setForm({ ...form, subtitle_ar: e.target.value })
                      }
                    />
                    <input
                      className="input-field"
                      placeholder={
                        lang === "de" ? "Untertitel (DE)" : "العنوان الفرعي DE"
                      }
                      value={form.subtitle_de || ""}
                      onChange={(e) =>
                        setForm({ ...form, subtitle_de: e.target.value })
                      }
                    />
                    <input
                      className="input-field"
                      placeholder={
                        lang === "de" ? "Link-URL (optional)" : "رابط (اختياري)"
                      }
                      value={form.link_url || ""}
                      onChange={(e) =>
                        setForm({ ...form, link_url: e.target.value })
                      }
                    />
                    <select
                      className="input-field"
                      value={form.link_category_id || ""}
                      onChange={(e) =>
                        setForm({ ...form, link_category_id: e.target.value })
                      }
                    >
                      <option value="">
                        {lang === "de"
                          ? "— Kategorie-Link —"
                          : "— رابط فئة —"}
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
                        onChange={(e) =>
                          setForm({ ...form, active: e.target.checked })
                        }
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
                        {lang === "de"
                          ? "Noch keine Banner in dieser Sektion."
                          : "لا توجد لافتات في هذا القسم بعد."}
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
                          title={
                            s.active === false ? t("active") : t("inactive")
                          }
                        >
                          {s.active === false ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
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
              )}

              {selected.type === "brands" && (
                <div className="grid lg:grid-cols-2 gap-6">
                  <form
                    onSubmit={saveBrand}
                    className="card-boutique p-4 sm:p-5 space-y-3"
                  >
                    <h2 className="font-medium text-luxury-ink flex items-center gap-2">
                      <Building2 size={16} />
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
                      enableEditor
                    />
                    <input
                      className="input-field"
                      placeholder={
                        lang === "de" ? "Markenname" : "اسم العلامة"
                      }
                      value={brandForm.name}
                      onChange={(e) =>
                        setBrandForm({ ...brandForm, name: e.target.value })
                      }
                    />
                    <input
                      className="input-field"
                      placeholder={
                        lang === "de" ? "Link (optional)" : "رابط (اختياري)"
                      }
                      value={brandForm.link_url}
                      onChange={(e) =>
                        setBrandForm({ ...brandForm, link_url: e.target.value })
                      }
                    />
                    <Button
                      type="submit"
                      disabled={saving || !brandForm.image}
                    >
                      <Plus size={16} />
                      {saving ? t("saving") : t("save")}
                    </Button>
                  </form>

                  <div className="space-y-3">
                    {logos.length === 0 && (
                      <p className="text-sm text-gray-500">
                        {lang === "de"
                          ? "Noch keine Logos."
                          : "لا توجد شعارات بعد."}
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
                          <p className="text-sm font-medium truncate">
                            {l.name || l.id}
                          </p>
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

              {(selected.type === "products" ||
                selected.type === "categories") && (
                <p className="text-sm text-gray-500 card-boutique p-4">
                  {lang === "de"
                    ? "Inhalt kommt automatisch aus dem Katalog. Hier nur Titel, Typ und Reihenfolge steuern."
                    : "المحتوى يأتي تلقائياً من الكتالوج. هنا تضبط العنوان والنوع والترتيب فقط."}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
