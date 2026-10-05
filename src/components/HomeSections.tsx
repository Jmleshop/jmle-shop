"use client";

import { useEffect, useMemo, useState } from "react";
import { useShopLocale } from "@/components/ShopLocale";
import CompactBannerSlider from "@/components/CompactBannerSlider";
import BrandLogoTicker from "@/components/BrandLogoTicker";
import { HomepageCategoryHierarchy } from "@/components/CategoryHierarchy";
import OffersCarousel from "@/components/OffersCarousel";
import { cn } from "@/lib/cn";
import {
  LAYOUT_PREVIEW_MESSAGE,
  LAYOUT_PREVIEW_STRUCTURE,
  normalizeHomepageSectionsSafe,
  type LayoutDocument,
} from "@/lib/layout-builder-preview";
import type { BrandLogo, Category, HomepageSection, Product, Slide } from "@/types";

/** Optionale Sektions-Überschrift — leer = kein Abstand, immer AUSSERHALB des Banners */
export function OptionalSectionTitle({
  title,
  className,
}: {
  title?: string | null;
  className?: string;
}) {
  const text = (title ?? "").trim();
  if (!text) return null;
  return (
    <div className={cn("layout-section-title-wrap px-4 pt-5 sm:pt-6 pb-2.5", className)}>
      <h2 className="section-title text-lg sm:text-xl md:text-2xl">{text}</h2>
      <div className="gold-divider mt-2" aria-hidden />
    </div>
  );
}

export function BannerSection({
  slides,
  title,
  single = false,
}: {
  slides: Slide[];
  title?: string | null;
  single?: boolean;
}) {
  if (!slides.length) return null;
  return (
    <div className="w-full" data-home-section="banner">
      <OptionalSectionTitle title={title} />
      <CompactBannerSlider slides={slides} single={single} />
    </div>
  );
}

export function EmptyCategoryNotice() {
  const { t } = useShopLocale();
  return (
    <p className="text-center text-gray-500 font-ui py-16 px-4">
      {t("noProducts")}
    </p>
  );
}

function sectionHeading(
  section: HomepageSection,
  lang: "ar" | "de",
  titleOverrides?: LayoutDocument["sectionTitles"]
): string {
  const override = titleOverrides?.[section.id];
  if (override) {
    const pick = lang === "de" ? override.de || override.ar : override.ar || override.de;
    if (pick?.trim()) return pick.trim();
  }
  if (lang === "de") {
    return (section.titleDe || section.title || "").trim();
  }
  return (section.titleAr || section.title || "").trim();
}

function isBuilderFrame(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const q = window.location.search;
  return q.includes("_preview=1") || q.includes("_builder=1");
}

function orderSlides(
  slides: Slide[],
  orderIds: string[] | undefined
): Slide[] {
  if (!orderIds?.length) return slides;
  const map = new Map(slides.map((s) => [s.id, s]));
  const ordered: Slide[] = [];
  for (const id of orderIds) {
    const s = map.get(id);
    if (s) {
      ordered.push(s);
      map.delete(id);
    }
  }
  for (const s of map.values()) ordered.push(s);
  return ordered;
}

export function HomepageSectionsRenderer({
  sections,
  slidesByZone,
  brands,
  categories,
  offers,
  bestsellers,
  allProducts,
}: {
  sections: HomepageSection[];
  slidesByZone: Record<string, Slide[]>;
  brands: BrandLogo[];
  categories: Category[];
  offers: Product[];
  bestsellers: Product[];
  allProducts: Product[];
}) {
  const { lang } = useShopLocale();
  const [overrideSections, setOverrideSections] = useState<HomepageSection[] | null>(
    null
  );
  const [slideOrders, setSlideOrders] = useState<Record<string, string[]> | null>(
    null
  );
  const [titleOverrides, setTitleOverrides] = useState<
    LayoutDocument["sectionTitles"] | null
  >(null);

  useEffect(() => {
    if (!isBuilderFrame()) return;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;
      const type = (data as { type?: string }).type;

      if (type === LAYOUT_PREVIEW_STRUCTURE) {
        const sectionsRaw = (data as { sections?: unknown }).sections;
        const orders = (data as { slideOrders?: Record<string, string[]> })
          .slideOrders;
        const normalized = normalizeHomepageSectionsSafe(sectionsRaw);
        if (normalized.length) setOverrideSections(normalized);
        if (orders && typeof orders === "object") setSlideOrders(orders);
        return;
      }

      if (type === LAYOUT_PREVIEW_MESSAGE) {
        const doc = (data as { document?: LayoutDocument }).document;
        if (doc?.sectionTitles) setTitleOverrides(doc.sectionTitles);
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const activeSections = useMemo(() => {
    const list = overrideSections ?? sections;
    return [...list]
      .filter((s) => s.active !== false)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [overrideSections, sections]);

  return (
    <div className="home-sections-stack w-full">
      {activeSections.map((section) => {
        const title = sectionHeading(section, lang, titleOverrides ?? undefined);
        if (section.type === "slider" || section.type === "single") {
          const zone = section.zone || section.id;
          const slides = orderSlides(
            slidesByZone[zone] ?? [],
            slideOrders?.[zone]
          );
          return (
            <BannerSection
              key={section.id}
              slides={slides}
              title={title}
              single={section.type === "single"}
            />
          );
        }
        if (section.type === "brands") {
          return (
            <BrandLogoTicker key={section.id} logos={brands} title={title} />
          );
        }
        if (section.type === "categories") {
          return (
            <HomepageCategoryHierarchy
              key={section.id}
              categories={categories}
              title={title || undefined}
            />
          );
        }
        if (section.type === "products") {
          const products =
            section.productSource === "bestsellers"
              ? bestsellers
              : section.productSource === "all"
                ? allProducts
                : offers;
          return (
            <OffersCarousel
              key={section.id}
              products={products}
              title={title || undefined}
              reverse={section.productSource === "bestsellers"}
            />
          );
        }
        return null;
      })}
    </div>
  );
}
