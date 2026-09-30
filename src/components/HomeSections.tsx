"use client";

import { useShopLocale } from "@/components/ShopLocale";
import CompactBannerSlider from "@/components/CompactBannerSlider";
import BrandLogoTicker from "@/components/BrandLogoTicker";
import CategoryGrid from "@/components/CategoryGrid";
import OffersCarousel from "@/components/OffersCarousel";
import { cn } from "@/lib/cn";
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
    <div className={cn("text-center px-4 pt-5 sm:pt-6 pb-2.5", className)}>
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
    <div className="w-full">
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

function sectionHeading(section: HomepageSection, lang: "ar" | "de"): string {
  if (lang === "de") {
    return (section.titleDe || section.title || "").trim();
  }
  return (section.titleAr || section.title || "").trim();
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
  const ordered = [...sections]
    .filter((s) => s.active !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <>
      {ordered.map((section) => {
        const title = sectionHeading(section, lang);
        if (section.type === "slider" || section.type === "single") {
          const zone = section.zone || section.id;
          const slides = slidesByZone[zone] ?? [];
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
            <CategoryGrid
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
    </>
  );
}
