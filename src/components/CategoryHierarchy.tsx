"use client";

import Link from "next/link";
import Image from "next/image";
import type { Category } from "@/types";
import { useShopLocale } from "@/components/ShopLocale";
import { categoryTitle } from "@/lib/shop-i18n";
import { useAutoTranslate } from "@/hooks/useAutoTranslate";
import { originalImageSrc, SHOP_IMAGE_QUALITY } from "@/lib/sharp-image";
import { CategoryTile } from "@/components/CategoryGrid";
import { cn } from "@/lib/cn";
import { isAllCategoryId, isSaleCategoryId } from "@/lib/category-special";

function CategoryLabel({ category }: { category: Category }) {
  const { lang } = useShopLocale();
  const title = useAutoTranslate(
    lang,
    lang === "de" ? category.nameEn : category.name,
    lang === "de" ? category.name : category.nameEn
  );
  const fallback = categoryTitle(lang, category);
  return <>{title || fallback}</>;
}

/** Hauptkategorie als Karte mit Bild + optionale Unterkategorie-Leiste. */
function ParentCategoryBlock({ category }: { category: Category }) {
  const children = (category.children ?? []).filter(
    (c) => !isAllCategoryId(c.id) && !isSaleCategoryId(c.id)
  );

  return (
    <section className="space-y-3">
      <Link
        href={`/categories/${category.id}`}
        className="group relative block overflow-hidden rounded-2xl bg-jmle-warm aspect-[16/7] sm:aspect-[21/8] shadow-sm ring-1 ring-orange-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
      >
        <Image
          src={originalImageSrc(category.image)}
          alt=""
          fill
          quality={SHOP_IMAGE_QUALITY}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          sizes="(max-width: 768px) 100vw, 720px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 text-start">
          <h2 className="font-display text-xl sm:text-2xl text-white drop-shadow-sm">
            <CategoryLabel category={category} />
          </h2>
        </div>
      </Link>

      {children.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-3 sm:gap-3.5 px-1">
          {children.map((child) => (
            <CategoryTile key={child.id} category={child} variant="sub" />
          ))}
        </div>
      ) : null}
    </section>
  );
}

/**
 * Hierarchische Kategorien-Ansicht aus Live-DB-Daten:
 * Hauptkategorien mit Bild + Unterkategorien als Thumbnails.
 */
export default function CategoryHierarchy({
  categories,
  className,
  title,
}: {
  categories: Category[];
  className?: string;
  title?: string;
}) {
  const { t } = useShopLocale();
  const roots = categories
    .filter((c) => !isAllCategoryId(c.id) && !isSaleCategoryId(c.id))
    .filter((c) => !c.parentId)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  if (!roots.length) {
    return (
      <p className="text-center text-gray-500 font-ui py-16 px-4">
        {t("noCategories")}
      </p>
    );
  }

  const heading = (title ?? "").trim();

  return (
    <div className={cn("w-full", className)}>
      {heading ? (
        <div className="text-center mb-6 md:mb-8 px-4">
          <h1 className="section-title text-2xl sm:text-3xl">{heading}</h1>
          <div className="gold-divider mt-2" aria-hidden />
        </div>
      ) : null}
      <div className="mx-auto max-w-5xl space-y-8 md:space-y-10 px-4 md:px-6">
        {roots.map((cat) => (
          <ParentCategoryBlock key={cat.id} category={cat} />
        ))}
      </div>
    </div>
  );
}

/** Kompakte Startseiten-Variante: Hauptkacheln + Unterkategorien darunter. */
export function HomepageCategoryHierarchy({
  categories,
  title,
}: {
  categories: Category[];
  title?: string;
}) {
  const { t } = useShopLocale();
  const roots = categories
    .filter((c) => !isAllCategoryId(c.id) && !isSaleCategoryId(c.id))
    .filter((c) => !c.parentId && c.showOnHomepage !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  if (!roots.length) return null;
  const heading = (title ?? "").trim() || t("shopByCategory");

  return (
    <section className="py-6 md:py-8" data-home-section="categories">
      {heading ? (
        <div className="text-center mb-4 md:mb-5 px-4">
          <h2 className="section-title text-xl sm:text-2xl md:text-[1.65rem]">
            {heading}
          </h2>
          <div className="gold-divider mt-2 mb-0" aria-hidden />
        </div>
      ) : null}
      <div className="mx-auto max-w-5xl space-y-6 px-4 md:px-6">
        {roots.map((cat) => {
          const children = (cat.children ?? []).filter(
            (c) => !isAllCategoryId(c.id) && !isSaleCategoryId(c.id)
          );
          return (
            <div key={cat.id} className="space-y-2.5">
              <div className="flex justify-center">
                <CategoryTile category={cat} variant="parent" />
              </div>
              {children.length > 0 ? (
                <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
                  {children.map((child) => (
                    <CategoryTile
                      key={child.id}
                      category={child}
                      variant="sub"
                    />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
