"use client";

import Link from "next/link";
import Image from "next/image";
import type { Category } from "@/types";
import { useShopLocale } from "@/components/ShopLocale";
import { categoryTitle, type ShopMsgKey } from "@/lib/shop-i18n";
import { useAutoTranslate } from "@/hooks/useAutoTranslate";
import { originalImageSrc, SHOP_IMAGE_QUALITY } from "@/lib/sharp-image";

interface CategoryTileProps {
  category: Category;
}

export function CategoryTile({ category }: CategoryTileProps) {
  const { lang } = useShopLocale();
  const title = useAutoTranslate(
    lang,
    lang === "de" ? category.nameEn : category.name,
    lang === "de" ? category.name : category.nameEn
  );
  const fallbackTitle = categoryTitle(lang, category);
  const label =
    category.id === "all" || category.id === "sale" ? fallbackTitle : title || fallbackTitle;
  return (
    <Link
      href={`/categories/${category.id}`}
      className="group relative z-0 flex flex-col items-center gap-2.5 sm:gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 rounded-2xl"
    >
      <div className="relative aspect-square w-full max-w-[11rem] overflow-hidden rounded-2xl bg-jmle-cream shadow-md ring-1 ring-orange-200/70 transition-[box-shadow,ring-color] duration-300 ease-boutique group-hover:z-10 group-hover:shadow-xl group-hover:ring-brand-orange/40">
        <Image
          src={originalImageSrc(category.image)}
          alt={label}
          fill
          quality={SHOP_IMAGE_QUALITY}
          className="object-cover transition-transform duration-300 ease-boutique group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, (max-width: 1920px) 280px, 360px"
        />
      </div>
      <span className="font-ui text-xs sm:text-sm font-medium text-luxury-charcoal group-hover:text-brand-orange transition-colors text-center leading-snug px-1 min-h-[2.5em]">
        {label}
      </span>
    </Link>
  );
}

interface CategoryGridProps {
  categories: Category[];
  title?: string;
  titleKey?: Extract<ShopMsgKey, "shopByCategory" | "subcategories">;
}

export default function CategoryGrid({ categories, title, titleKey }: CategoryGridProps) {
  const { t } = useShopLocale();
  const heading = (title ?? "").trim() || (titleKey ? t(titleKey) : "");
  if (!categories.length) return null;

  return (
    <section className="py-8 md:py-12 px-4 md:px-8">
      {heading ? (
        <div className="text-center mb-6 md:mb-8">
          <h2 className="section-title">{heading}</h2>
          <div className="gold-divider" aria-hidden />
        </div>
      ) : null}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6 max-w-6xl mx-auto">
        {categories.map((category) => (
          <CategoryTile key={category.id} category={category} />
        ))}
      </div>
    </section>
  );
}
