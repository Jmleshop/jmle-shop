"use client";

import { useCallback, useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import { toast } from "react-hot-toast";
import ImageUpload from "@/components/admin/ImageUpload";
import { useAdminI18n } from "@/components/admin/AdminI18n";
import { Button } from "@/components/ui";
import {
  normalizeHomepageSections,
} from "@/lib/homepage-sections";
import type { HomepageSection, HomepageSectionType } from "@/types";

const TYPE_LABELS: Record<HomepageSectionType, { de: string; ar: string }> = {
  slider: { de: "Banner-Slider", ar: "سلايدر بانر" },
  single: { de: "Einzelbanner", ar: "بانر واحد" },
  brands: { de: "Marken-Ticker", ar: "شريط العلامات" },
  products: { de: "Produkt-Grid", ar: "شبكة منتجات" },
  categories: { de: "Kategorien", ar: "الفئات" },
};

type WatermarkPosition = "bottom-right" | "bottom-left" | "center" | "tile";

export default function AdminSiteSettingsPage() {
  const { t, lang } = useAdminI18n();
  const [logo, setLogo] = useState("");
  const [name, setName] = useState("jmle");
  const [tagline, setTagline] = useState("");
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [watermarkLogo, setWatermarkLogo] = useState("");
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.38);
  const [watermarkScale, setWatermarkScale] = useState(0.22);
  const [watermarkPosition, setWatermarkPosition] =
    useState<WatermarkPosition>("bottom-right");
  const [watermarkBusy, setWatermarkBusy] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const typeLabel = (type: HomepageSectionType, section: HomepageSection) => {
    const base = lang === "de" ? TYPE_LABELS[type].de : TYPE_LABELS[type].ar;
    if (type === "products") {
      const src =
        section.productSource === "bestsellers"
          ? lang === "de"
            ? "Bestseller"
            : "الأكثر مبيعاً"
          : section.productSource === "all"
            ? lang === "de"
              ? "Alle"
              : "الكل"
            : lang === "de"
              ? "Angebote"
              : "عروض";
      return `${base} — ${src}`;
    }
    if ((type === "slider" || type === "single") && section.zone) {
      return `${base} (${section.zone})`;
    }
    return base;
  };

  const load = useCallback(async () => {
    setError("");
    const res = await fetch("/api/admin/site");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "خطأ");
      return;
    }
    const site = data.site ?? {};
    setLogo(String(data.logo || site.logo || ""));
    setName(String(site.name || "jmle"));
    setTagline(String(site.tagline || ""));
    setWatermarkEnabled(Boolean(site.productWatermarkEnabled));
    setWatermarkLogo(String(site.productWatermarkLogo || ""));
    setWatermarkOpacity(Number(site.productWatermarkOpacity ?? 0.38) || 0.38);
    setWatermarkScale(Number(site.productWatermarkScale ?? 0.22) || 0.22);
    const pos = String(site.productWatermarkPosition || "bottom-right");
    setWatermarkPosition(
      pos === "bottom-left" || pos === "center" || pos === "tile"
        ? pos
        : "bottom-right"
    );
    setSections(
      normalizeHomepageSections(site.homepageSections, {
        brands: site.brandsSectionTitle,
        banner2: site.banner2SectionTitle,
        banner3: site.banner3SectionTitle,
        categories: site.categoriesSectionTitle,
      })
    );
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError("");
    const ordered = sections.map((s, i) => ({ ...s, sortOrder: i }));
    const categoriesTitle =
      ordered.find((s) => s.type === "categories")?.titleAr ||
      ordered.find((s) => s.type === "categories")?.title ||
      "";
    const brandsTitle =
      ordered.find((s) => s.type === "brands")?.titleAr ||
      ordered.find((s) => s.type === "brands")?.title ||
      "";
    const banner2Title =
      ordered.find((s) => s.zone === "banner2" || s.id === "sec-banner2")
        ?.titleAr ||
      ordered.find((s) => s.zone === "banner2" || s.id === "sec-banner2")?.title ||
      "";
    const banner3Title =
      ordered.find((s) => s.zone === "banner3" || s.id === "sec-banner3")
        ?.titleAr ||
      ordered.find((s) => s.zone === "banner3" || s.id === "sec-banner3")?.title ||
      "";

    try {
      const res = await fetch("/api/admin/site", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logo,
          name,
          tagline,
          homepageSections: ordered,
          categoriesSectionTitle: categoriesTitle,
          brandsSectionTitle: brandsTitle,
          banner2SectionTitle: banner2Title,
          banner3SectionTitle: banner3Title,
          productWatermarkEnabled: watermarkEnabled,
          productWatermarkLogo: watermarkLogo.trim(),
          productWatermarkOpacity: watermarkOpacity,
          productWatermarkScale: watermarkScale,
          productWatermarkPosition: watermarkPosition,
        }),
      });
      const data = await res.json().catch(() => ({}));
      setSaving(false);
      if (!res.ok) {
        const message =
          typeof data.error === "string" && data.error.trim()
            ? data.error
            : lang === "de"
              ? "Site-Einstellungen konnten nicht gespeichert werden."
              : "تعذّر حفظ إعدادات الموقع.";
        const clean = /violates not-null|null value in column|PGRST|SQL/i.test(
          message
        )
          ? lang === "de"
            ? "Speichern fehlgeschlagen. Bitte erneut versuchen."
            : "فشل الحفظ. يرجى المحاولة مرة أخرى."
          : message;
        setError(clean);
        toast.error(clean);
        return;
      }
      setLogo(String(data.logo || data.site?.logo || logo));
      toast.success(lang === "de" ? "Gespeichert" : "تم الحفظ");
    } catch {
      setSaving(false);
      const clean =
        lang === "de"
          ? "Netzwerkfehler beim Speichern."
          : "خطأ في الشبكة أثناء الحفظ.";
      setError(clean);
      toast.error(clean);
    }
  };

  const applyWatermarkToAll = async () => {
    if (watermarkBusy) return;
    if (!watermarkEnabled) {
      toast.error(
        lang === "de"
          ? "Bitte Wasserzeichen aktivieren und speichern."
          : "فعّل العلامة المائية واحفظ أولاً."
      );
      return;
    }
    if (
      !window.confirm(
        lang === "de"
          ? "Wasserzeichen auf alle vorhandenen Produktbilder anwenden? Das kann einige Minuten dauern."
          : "تطبيق العلامة المائية على كل صور المنتجات الحالية؟ قد يستغرق ذلك بضع دقائق."
      )
    ) {
      return;
    }
    setWatermarkBusy(true);
    let offset = 0;
    let totalWatermarked = 0;
    let totalFailed = 0;
    try {
      // Erst speichern, damit Server aktuelle Settings liest
      await save();
      for (let guard = 0; guard < 2000; guard += 1) {
        const res = await fetch("/api/admin/watermark-all-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apply: true, offset }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(String(data.error || t("productWatermarkFail")));
        }
        if (data.enabled === false) {
          throw new Error(
            lang === "de"
              ? "Wasserzeichen ist nicht aktiv."
              : "العلامة المائية غير مفعّلة."
          );
        }
        totalWatermarked += Number(data.watermarked) || 0;
        totalFailed += Number(data.failed) || 0;
        offset = Number(data.nextOffset) || offset;
        if (data.done || !data.examined) break;
      }
      toast.success(
        `${t("productWatermarkDone")}: ${totalWatermarked}${
          totalFailed ? ` / ${totalFailed} Fehler` : ""
        }`
      );
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : t("productWatermarkFail")
      );
    } finally {
      setWatermarkBusy(false);
    }
  };

  const updateSectionTitle = (id: string, titleAr: string) => {
    setSections((list) =>
      list.map((s) =>
        s.id === id
          ? {
              ...s,
              titleAr,
              // Arabisch ist Primärsprache — title spiegelt titleAr
              title: titleAr,
            }
          : s
      )
    );
  };

  if (!loaded) {
    return (
      <div className="p-6 text-sm text-gray-500" dir="rtl">
        جاري التحميل…
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <Settings2 className="text-brand-orange" size={22} />
        <h1 className="text-xl font-semibold text-luxury-ink">{t("siteSettings")}</h1>
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 text-brand-red text-sm px-3 py-2">{error}</p>
      ) : null}

      <section className="card-boutique p-4 sm:p-6 space-y-4">
        <div>
          <h2 className="font-medium text-luxury-ink mb-1">{t("siteLogo")}</h2>
          <p className="text-xs text-gray-500 mb-3">{t("siteLogoHint")}</p>
          <ImageUpload
            value={logo}
            onChange={(url) => setLogo(typeof url === "string" ? url : url[0] ?? "")}
            folder="brand"
            multiple={false}
            enableEditor={false}
            label={t("siteLogo")}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t("shopName")}</label>
            <input
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              dir="rtl"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t("shopTagline")}</label>
            <input
              className="input-field"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              dir="rtl"
            />
          </div>
        </div>
      </section>

      <section className="card-boutique p-4 sm:p-6 space-y-4">
        <div>
          <h2 className="font-medium text-luxury-ink mb-1">{t("productWatermark")}</h2>
          <p className="text-xs text-gray-500">{t("productWatermarkHint")}</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-luxury-ink cursor-pointer">
          <input
            type="checkbox"
            checked={watermarkEnabled}
            onChange={(e) => setWatermarkEnabled(e.target.checked)}
            className="rounded border-orange-300 text-brand-orange focus:ring-brand-orange"
          />
          {t("productWatermarkEnable")}
        </label>
        <div>
          <p className="text-xs text-gray-500 mb-2">{t("productWatermarkLogo")}</p>
          <p className="text-[11px] text-gray-400 mb-2">{t("productWatermarkLogoHint")}</p>
          <ImageUpload
            value={watermarkLogo}
            onChange={(url) =>
              setWatermarkLogo(typeof url === "string" ? url : url[0] ?? "")
            }
            folder="brand"
            multiple={false}
            enableEditor={false}
            label={t("productWatermarkLogo")}
          />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              {t("productWatermarkOpacity")} ({Math.round(watermarkOpacity * 100)}%)
            </label>
            <input
              type="range"
              min={0.1}
              max={0.85}
              step={0.01}
              value={watermarkOpacity}
              onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              {t("productWatermarkScale")} ({Math.round(watermarkScale * 100)}%)
            </label>
            <input
              type="range"
              min={0.08}
              max={0.4}
              step={0.01}
              value={watermarkScale}
              onChange={(e) => setWatermarkScale(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              {t("productWatermarkPosition")}
            </label>
            <select
              className="input-field"
              value={watermarkPosition}
              onChange={(e) =>
                setWatermarkPosition(e.target.value as WatermarkPosition)
              }
            >
              <option value="bottom-right">{t("productWatermarkPosBR")}</option>
              <option value="bottom-left">{t("productWatermarkPosBL")}</option>
              <option value="center">{t("productWatermarkPosCenter")}</option>
              <option value="tile">{t("productWatermarkPosTile")}</option>
            </select>
          </div>
        </div>
        <div className="rounded-xl border border-orange-100/80 bg-jmle-cream/40 p-3 space-y-2">
          <p className="text-xs text-gray-500">{t("productWatermarkApplyAllHint")}</p>
          <Button
            type="button"
            variant="outline"
            disabled={watermarkBusy || !watermarkEnabled}
            onClick={() => void applyWatermarkToAll()}
          >
            {watermarkBusy ? t("productWatermarkRunning") : t("productWatermarkApplyAll")}
          </Button>
        </div>
      </section>

      <section className="card-boutique p-4 sm:p-6 space-y-4">
        <div>
          <h2 className="font-medium text-luxury-ink mb-1">{t("sectionTitles")}</h2>
          <p className="text-xs text-gray-500">{t("sectionTitlesHint")}</p>
        </div>
        <div className="space-y-3">
          {sections.map((section) => (
            <div key={section.id} className="rounded-xl border border-orange-100/80 p-3">
              <label className="block text-xs text-gray-500 mb-1">
                {typeLabel(section.type, section)}
              </label>
              <input
                className="input-field"
                dir="rtl"
                placeholder="اترك فارغاً للإخفاء"
                value={section.titleAr ?? section.title ?? ""}
                onChange={(e) => updateSectionTitle(section.id, e.target.value)}
              />
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="button" onClick={() => void save()} disabled={saving}>
          {saving ? t("saving") : t("save")}
        </Button>
      </div>
    </div>
  );
}
