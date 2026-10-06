"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import ImageUpload from "@/components/admin/ImageUpload";
import { useAdminI18n } from "@/components/admin/AdminI18n";
import type { HomepageSection } from "@/types";

type SlideRow = {
  id: string;
  image: string;
  title?: string;
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
});

/**
 * Sofort speicherbares Banner-/Slide-CRUD für eine Zone.
 * Ein HD-Bild + Links; Responsive über CSS object-fit (Banner-Tab-Styles).
 */
export default function BuilderSlidePanel({
  de,
  sections,
  onSlidesChanged,
}: {
  de: boolean;
  sections: HomepageSection[];
  onSlidesChanged?: () => void;
}) {
  const { t } = useAdminI18n();
  const bannerSections = useMemo(
    () =>
      sections.filter((s) => s.type === "slider" || s.type === "single"),
    [sections]
  );
  const [zoneId, setZoneId] = useState("");
  const [slides, setSlides] = useState<SlideRow[]>([]);
  const [categories, setCategories] = useState<CatOption[]>([]);
  const [form, setForm] = useState(emptySlide());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [autoOpenImageUrl, setAutoOpenImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!bannerSections.length) {
      setZoneId("");
      return;
    }
    setZoneId((prev) => {
      if (prev && bannerSections.some((s) => (s.zone || s.id) === prev)) {
        return prev;
      }
      const first = bannerSections[0];
      return first.zone || first.id;
    });
  }, [bannerSections]);

  const loadSlides = useCallback(async (zone: string) => {
    if (!zone) {
      setSlides([]);
      return;
    }
    const res = await fetch(`/api/admin/slides?zone=${encodeURIComponent(zone)}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Fehler");
      return;
    }
    setSlides(data.slides ?? []);
  }, []);

  useEffect(() => {
    void loadSlides(zoneId);
    setForm(emptySlide());
    setEditingId(null);
    setError("");
  }, [zoneId, loadSlides]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/categories");
      const data = await res.json();
      if (res.ok) {
        setCategories(
          ((data.categories ?? []) as CatOption[]).filter(
            (c) => !(c as { deleted_at?: string | null }).deleted_at
          )
        );
      }
    })();
  }, []);

  const notify = () => onSlidesChanged?.();

  const saveSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneId || !form.image) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/slides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        id: editingId || form.id,
        slider_zone: zoneId,
        sort_order: editingId ? form.sort_order : slides.length,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Fehler");
      toast.error(data.error || "Fehler");
      return;
    }
    setForm(emptySlide());
    setEditingId(null);
    await loadSlides(zoneId);
    toast.success(de ? "Banner gespeichert (live)" : "تم الحفظ (مباشر)");
    notify();
  };

  const editSlide = (s: SlideRow, opts?: { openImageEditor?: boolean }) => {
    setEditingId(s.id);
    setForm({
      id: s.id,
      image: s.image,
      title_ar: s.title_ar || s.title || "",
      title_de: s.title_de || "",
      subtitle_ar: s.subtitle_ar || "",
      subtitle_de: s.subtitle_de || "",
      link_url: s.link_url || "",
      link_category_id: s.link_category_id || "",
      sort_order: s.sort_order ?? 0,
      active: s.active !== false,
      media_type: s.media_type || "image",
      video_url: s.video_url || "",
    });
    setAutoOpenImageUrl(opts?.openImageEditor && s.image ? s.image : null);
  };

  const deleteSlide = async (id: string) => {
    if (!confirm(de ? "Banner löschen?" : "حذف اللافتة؟")) return;
    await fetch(`/api/admin/slides?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    await loadSlides(zoneId);
    notify();
  };

  const toggleActive = async (s: SlideRow) => {
    await fetch("/api/admin/slides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...s,
        active: s.active === false,
        title_ar: s.title_ar || s.title || "",
        title_de: s.title_de || "",
        slider_zone: zoneId,
      }),
    });
    await loadSlides(zoneId);
    notify();
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
    notify();
  };

  if (!bannerSections.length) {
    return (
      <p className="text-[11px] text-zinc-500">
        {de
          ? "Keine Banner-Sektion. Unter Struktur eine Slider-/Einzelbanner-Sektion anlegen und veröffentlichen."
          : "لا يوجد قسم بانر. أضف قسماً من تبويب الهيكل ثم انشر."}
      </p>
    );
  }

  return (
    <div className="space-y-4 border-t border-zinc-100 pt-4">
      <div>
        <h3 className="text-xs font-semibold text-zinc-800">
          {de ? "Banner-Inhalte" : "محتوى البانر"}
        </h3>
        <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
          {de
            ? "Ein hochauflösendes Bild reicht — Anpassung an Desktop/Tablet/Mobile über object-fit & Viewport-Styles oben. Speichern wirkt sofort live."
            : "صورة واحدة عالية الدقة تكفي — التكيف مع الشاشات عبر object-fit وإعدادات العرض أعلاه. الحفظ فوري."}
        </p>
      </div>

      <label className="block text-xs">
        <span className="text-zinc-600">{de ? "Banner-Zone" : "منطقة البانر"}</span>
        <select
          className="mt-1 h-9 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs"
          value={zoneId}
          onChange={(e) => setZoneId(e.target.value)}
        >
          {bannerSections.map((s) => {
            const z = s.zone || s.id;
            const label =
              s.titleAr || s.title || s.titleDe || s.type || z;
            return (
              <option key={s.id} value={z}>
                {label} ({z})
              </option>
            );
          })}
        </select>
      </label>

      {error ? (
        <p className="rounded-md bg-red-50 px-2 py-1.5 text-[11px] text-red-600">
          {error}
        </p>
      ) : null}

      <form onSubmit={saveSlide} className="space-y-2.5">
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
          autoOpenUrl={autoOpenImageUrl}
          onAutoOpenConsumed={() => setAutoOpenImageUrl(null)}
        />
        <input
          className="h-9 w-full rounded-md border border-zinc-200 px-2.5 text-xs"
          dir="rtl"
          placeholder={t("nameAr")}
          value={form.title_ar || ""}
          onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
        />
        <input
          className="h-9 w-full rounded-md border border-zinc-200 px-2.5 text-xs"
          placeholder={t("nameDe")}
          value={form.title_de || ""}
          onChange={(e) => setForm({ ...form, title_de: e.target.value })}
        />
        <input
          className="h-9 w-full rounded-md border border-zinc-200 px-2.5 text-xs"
          placeholder={de ? "Link-URL (optional)" : "رابط (اختياري)"}
          value={form.link_url || ""}
          onChange={(e) => setForm({ ...form, link_url: e.target.value })}
        />
        <select
          className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs"
          value={form.link_category_id || ""}
          onChange={(e) =>
            setForm({ ...form, link_category_id: e.target.value })
          }
        >
          <option value="">
            {de ? "— Kategorie-Link —" : "— رابط فئة —"}
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_de || c.name_ar}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs min-h-9">
          <input
            type="checkbox"
            checked={form.active !== false}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
            className="accent-zinc-900"
          />
          {t("active")}
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving || !form.image}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-lg bg-zinc-900 text-xs font-semibold text-white disabled:opacity-40"
          >
            <Plus size={14} />
            {saving ? t("saving") : t("save")}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(emptySlide());
              }}
              className="h-9 rounded-lg border border-zinc-200 px-3 text-xs"
            >
              {de ? "Abbrechen" : "إلغاء"}
            </button>
          ) : null}
        </div>
      </form>

      <ul className="space-y-2">
        {slides.map((s, i) => (
          <li
            key={s.id}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white p-2"
          >
            <button
              type="button"
              className="h-12 w-16 shrink-0 overflow-hidden rounded-md bg-zinc-50"
              onClick={() => editSlide(s, { openImageEditor: true })}
              title={de ? "Bild bearbeiten" : "تعديل الصورة"}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.image}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium text-zinc-800">
                {s.title_de || s.title_ar || s.title || s.id}
              </p>
              <p className="truncate text-[10px] text-zinc-400">
                {s.link_category_id
                  ? `→ /categories/${s.link_category_id}`
                  : s.link_url || "—"}
              </p>
            </div>
            <div className="flex flex-col">
              <button
                type="button"
                className="p-0.5 text-zinc-400 hover:text-zinc-700 disabled:opacity-30"
                disabled={i === 0}
                onClick={() => void moveSlide(s.id, -1)}
              >
                <ArrowUp size={12} />
              </button>
              <button
                type="button"
                className="p-0.5 text-zinc-400 hover:text-zinc-700 disabled:opacity-30"
                disabled={i === slides.length - 1}
                onClick={() => void moveSlide(s.id, 1)}
              >
                <ArrowDown size={12} />
              </button>
            </div>
            <button
              type="button"
              className="p-1 text-zinc-400 hover:text-zinc-700"
              onClick={() => void toggleActive(s)}
            >
              {s.active === false ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
            <button
              type="button"
              className="text-[10px] text-amber-700"
              onClick={() => editSlide(s)}
            >
              {t("edit")}
            </button>
            <button
              type="button"
              className="p-1 text-red-500"
              onClick={() => void deleteSlide(s.id)}
            >
              <Trash2 size={13} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
