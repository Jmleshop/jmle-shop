"use client";

import Link from "next/link";
import Image from "next/image";
import type { Category } from "@/types";
import { useShopLocale } from "@/components/ShopLocale";
import { categoryTitle, type ShopMsgKey } from "@/lib/shop-i18n";
import { useAutoTranslate } from "@/hooks/useAutoTranslate";
import { originalImageSrc, SHOP_IMAGE_QUALITY } from "@/lib/sharp-image";
import { cn } from "@/lib/cn";

type CategoryTileVariant = "parent" | "sub";

interface CategoryTileProps {
  category: Category;
  /** parent = abgerundetes Quadrat (Oberkategorie), sub = rund (Unterkategorie) */
  variant?: CategoryTileVariant;
}

/** Einheitliche Icon-Größe — ruhig, touch-freundlich, kein Riesen-/Mini-Kachel */
const PARENT_ICON =
  "h-[4.5rem] w-[4.5rem] sm:h-[5rem] sm:w-[5rem] md:h-[5.5rem] md:w-[5.5rem]";
const SUB_ICON =
  "h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem] md:h-20 md:w-20";

export function CategoryTile({ category, variant = "parent" }: CategoryTileProps) {
  const { lang } = useShopLocale();
  const title = useAutoTranslate(
    lang,
    lang === "de" ? category.nameEn : category.name,
    lang === "de" ? category.name : category.nameEn
  );
  const fallbackTitle = categoryTitle(lang, category);
  const label =
    category.id === "all" || category.id === "sale"
      ? fallbackTitle
      : title || fallbackTitle;
  const isSub = variant === "sub";

  return (
    <Link
      href={`/categories/${category.id}`}
      className="group flex w-[5.5rem] sm:w-[6.25rem] md:w-[6.75rem] flex-col items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40 focus-visible:ring-offset-2 focus-visible:ring-offset-jmle-cream rounded-xl"
    >
      <div
        className={cn(
          "category-icon-circle relative overflow-hidden bg-white shadow-sm ring-1 ring-orange-100/90 transition-[ring-color,transform,box-shadow] duration-300 ease-boutique group-hover:-translate-y-0.5 group-hover:shadow-boutique group-hover:ring-brand-orange/35",
          isSub ? "rounded-full" : "rounded-2xl",
          isSub ? SUB_ICON : PARENT_ICON
        )}
      >
        <Image
          src={originalImageSrc(category.image)}
          alt={label}
          fill
          quality={SHOP_IMAGE_QUALITY}
          className="category-icon-media object-cover"
          sizes="96px"
        />
      </div>
      <span className="font-ui text-[11px] sm:text-xs font-medium text-luxury-charcoal group-hover:text-brand-orange transition-colors text-center leading-snug px-0.5 line-clamp-2 min-h-[2.5em] w-full">
        {label}
      </span>
    </Link>
  );
}

interface CategoryGridProps {
  categories: Category[];
  title?: string;
  titleKey?: Extract<ShopMsgKey, "shopByCategory" | "subcategories">;
  /** Explicit override; defaults to "sub" when titleKey is subcategories */
  variant?: CategoryTileVariant;
}

export default function CategoryGrid({
  categories,
  title,
  titleKey,
  variant,
}: CategoryGridProps) {
  const { t } = useShopLocale();
  const heading = (title ?? "").trim() || (titleKey ? t(titleKey) : "");
  if (!categories.length) return null;
  const tileVariant: CategoryTileVariant =
    variant ?? (titleKey === "subcategories" ? "sub" : "parent");

  return (
    <section className="home-content-section py-7 md:py-10 px-4 sm:px-6 md:px-8">
      {heading ? (
        <div className="layout-section-title-wrap home-section-title text-center mb-5 md:mb-6">
          <h2 className="section-title text-xl sm:text-2xl md:text-[1.65rem] tracking-tight">
            {heading}
          </h2>
          <div className="gold-divider mt-2.5 mb-0" aria-hidden />
        </div>
      ) : null}
      <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-x-3 gap-y-4 sm:gap-x-4 sm:gap-y-5 md:gap-x-5 md:gap-y-6">
        {categories.map((category) => (
          <CategoryTile
            key={category.id}
            category={category}
            variant={tileVariant}
          />
        ))}
      </div>
    </section>
  );
}
