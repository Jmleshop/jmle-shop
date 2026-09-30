"use client";

import Link from "next/link";
import Image from "next/image";
import type { Category } from "@/types";
import { useShopLocale } from "@/components/ShopLocale";
import { categoryTitle, type ShopMsgKey } from "@/lib/shop-i18n";
import { useAutoTranslate } from "@/hooks/useAutoTranslate";
import { originalImageSrc, SHOP_IMAGE_QUALITY } from "@/lib/sharp-image";

type CategoryTileVariant = "parent" | "sub";

interface CategoryTileProps {
  category: Category;
  /** parent = eckig (Oberkategorie), sub = rund (Unterkategorie) */
  variant?: CategoryTileVariant;
}

export function CategoryTile({ category, variant = "parent" }: CategoryTileProps) {
  const { lang } = useShopLocale();
  const title = useAutoTranslate(
    lang,
    lang === "de" ? category.nameEn : category.name,
    lang === "de" ? category.name : category.nameEn
  );
  const fallbackTitle = categoryTitle(lang, category);
  const label =
    category.id === "all" || category.id === "sale" ? fallbackTitle : title || fallbackTitle;
  const isSub = variant === "sub";

  return (
    <Link
      href={`/categories/${category.id}`}
      className={
        isSub
          ? "group flex w-[5.5rem] sm:w-[6rem] shrink-0 flex-col items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 rounded-full"
          : "group relative z-0 flex flex-col items-center gap-2.5 sm:gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 rounded-2xl"
      }
    >
      <div
        className={
          isSub
            ? "relative size-[5.5rem] sm:size-[5.75rem] overflow-hidden rounded-full bg-jmle-cream shadow-sm ring-1 ring-orange-200/70 transition-[box-shadow,ring-color] duration-300 ease-boutique group-hover:shadow-md group-hover:ring-brand-orange/40"
            : "relative aspect-square w-full max-w-[11rem] overflow-hidden rounded-2xl bg-jmle-cream shadow-md ring-1 ring-orange-200/70 transition-[box-shadow,ring-color] duration-300 ease-boutique group-hover:z-10 group-hover:shadow-xl group-hover:ring-brand-orange/40"
        }
      >
        <Image
          src={originalImageSrc(category.image)}
          alt={label}
          fill
          quality={SHOP_IMAGE_QUALITY}
          className="object-cover transition-transform duration-300 ease-boutique group-hover:scale-[1.03]"
          sizes={isSub ? "96px" : "(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 280px"}
        />
      </div>
      <span
        className={
          isSub
            ? "font-ui text-[11px] sm:text-xs font-medium text-luxury-charcoal group-hover:text-brand-orange transition-colors text-center leading-snug px-0.5 line-clamp-2 min-h-[2.4em]"
            : "font-ui text-xs sm:text-sm font-medium text-luxury-charcoal group-hover:text-brand-orange transition-colors text-center leading-snug px-1 min-h-[2.5em]"
        }
      >
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
  const isSub = tileVariant === "sub";

  return (
    <section className="py-8 md:py-12 px-4 md:px-8">
      {heading ? (
        <div className="text-center mb-6 md:mb-8">
          <h2 className="section-title">{heading}</h2>
          <div className="gold-divider" aria-hidden />
        </div>
      ) : null}
      <div
        className={
          isSub
            ? "mx-auto flex max-w-5xl flex-wrap justify-center gap-x-3 gap-y-4 sm:gap-x-4 sm:gap-y-5"
            : "mx-auto grid max-w-6xl grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6 lg:grid-cols-6"
        }
      >
        {categories.map((category) => (
          <CategoryTile key={category.id} category={category} variant={tileVariant} />
        ))}
      </div>
    </section>
  );
}
