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

/** Einheitliche, professionelle Icon-Größe (kein Riesen- oder Mini-Kachel) */
const PARENT_ICON =
  "h-[4.75rem] w-[4.75rem] sm:h-[5.25rem] sm:w-[5.25rem] md:h-24 md:w-24";
const SUB_ICON =
  "h-[4.25rem] w-[4.25rem] sm:h-[4.75rem] sm:w-[4.75rem] md:h-[5.25rem] md:w-[5.25rem]";

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
      className="group flex w-[5.75rem] sm:w-[6.25rem] md:w-28 flex-col items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
    >
      <div
        className={cn(
          "category-icon-circle relative overflow-hidden bg-white shadow-md ring-1 ring-orange-100/80 transition-[ring-color,transform,box-shadow] duration-300 ease-boutique group-hover:scale-[1.03] group-hover:shadow-lg group-hover:ring-brand-orange/40",
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
      <span className="font-ui text-[11px] sm:text-xs font-medium text-luxury-charcoal group-hover:text-brand-orange transition-colors text-center leading-snug px-0.5 line-clamp-2 min-h-[2.4em] w-full">
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
    <section className="py-6 md:py-8 px-4 md:px-6">
      {heading ? (
        <div className="text-center mb-4 md:mb-5">
          <h2 className="section-title text-xl sm:text-2xl md:text-[1.65rem]">
            {heading}
          </h2>
          <div className="gold-divider mt-2 mb-0" aria-hidden />
        </div>
      ) : null}
      <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-3 sm:gap-3.5 md:gap-4">
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
