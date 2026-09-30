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
      className="group flex flex-col items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 rounded-2xl"
    >
      <div className="relative w-32 h-32 sm:w-36 sm:h-36 md:w-44 md:h-44">
        <div className="relative w-full h-full rounded-2xl overflow-hidden bg-jmle-cream shadow-lg ring-1 ring-orange-200/70 transition-all duration-300 ease-boutique group-hover:scale-[1.05] group-hover:-translate-y-1.5 group-hover:shadow-xl group-hover:ring-brand-orange/40">
          <Image
            src={originalImageSrc(category.image)}
            alt={label}
            fill
            quality={SHOP_IMAGE_QUALITY}
            className="object-cover"
            sizes="176px"
          />
        </div>
      </div>
      <span className="font-ui text-xs sm:text-sm font-medium text-luxury-charcoal group-hover:text-brand-orange transition-colors text-center leading-snug">
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
    <section className="py-12 md:py-16 px-4 md:px-8">
      {heading ? (
        <div className="text-center mb-10">
          <h2 className="section-title">{heading}</h2>
          <div className="gold-divider" aria-hidden />
        </div>
      ) : null}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-5 md:gap-7 max-w-6xl mx-auto">
        {categories.map((category) => (
          <CategoryTile key={category.id} category={category} />
        ))}
      </div>
    </section>
  );
}
