"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { Category } from "@/types";
import { useShopLocale } from "@/components/ShopLocale";
import { categoryTitle } from "@/lib/shop-i18n";
import { cn } from "@/lib/cn";
import { isAllCategoryId, isSaleCategoryId } from "@/lib/category-special";
import { originalImageSrc, SHOP_IMAGE_QUALITY } from "@/lib/sharp-image";

function CategoryThumb({
  category,
  size = 36,
}: {
  category: Category;
  size?: number;
}) {
  return (
    <span
      className="relative shrink-0 overflow-hidden rounded-lg bg-jmle-warm ring-1 ring-orange-100/80"
      style={{ width: size, height: size }}
    >
      <Image
        src={originalImageSrc(category.image)}
        alt=""
        fill
        quality={SHOP_IMAGE_QUALITY}
        className="object-cover"
        sizes={`${size}px`}
      />
    </span>
  );
}

function CategoryBranch({
  category,
  depth,
  onNavigate,
}: {
  category: Category;
  depth: number;
  onNavigate?: () => void;
}) {
  const { lang } = useShopLocale();
  const children = category.children ?? [];
  const hasChildren = children.length > 0;
  const [open, setOpen] = useState(false);
  const label = categoryTitle(lang, category);

  if (!hasChildren) {
    return (
      <Link
        href={`/categories/${category.id}`}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-2.5 px-3 py-2.5 min-h-11 text-sm font-ui font-medium text-luxury-charcoal",
          "hover:bg-brand-orange/15 hover:text-brand-orange rounded-xl transition-colors",
          depth > 0 && "ms-3 border-s border-orange-100/80 ps-3"
        )}
      >
        <CategoryThumb category={category} size={depth > 0 ? 32 : 36} />
        <span className="min-w-0 truncate">{label}</span>
      </Link>
    );
  }

  return (
    <div className="w-full">
      <div
        className={cn(
          "flex items-stretch gap-0.5 rounded-xl",
          depth > 0 && "ms-3 border-s border-orange-100/80 ps-2"
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex-1 flex items-center gap-2.5 px-3 py-2.5 min-h-11 text-start",
            "text-sm font-ui font-medium text-luxury-charcoal",
            "hover:bg-brand-orange/15 hover:text-brand-orange rounded-xl transition-colors"
          )}
          aria-expanded={open}
        >
          <CategoryThumb category={category} size={36} />
          <span className="min-w-0 flex-1 truncate">{label}</span>
          <ChevronDown
            size={18}
            className={cn(
              "shrink-0 transition-transform duration-200",
              open && "rotate-180"
            )}
            aria-hidden
          />
        </button>
        <Link
          href={`/categories/${category.id}`}
          onClick={onNavigate}
          className="shrink-0 px-2.5 min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl text-gray-400 hover:bg-brand-orange/15 hover:text-brand-orange"
          aria-label={label}
          title={label}
        >
          <ExternalLink size={16} aria-hidden />
        </Link>
      </div>
      {open && (
        <div className="mt-0.5 space-y-0.5" role="group">
          {children.map((child) => (
            <CategoryBranch
              key={child.id}
              category={child}
              depth={depth + 1}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Ausklappbarer Kategorien-Baum mit Thumbnails — nur Live-DB-Kategorien. */
export default function CategoryNavTree({
  categories,
  onNavigate,
}: {
  categories: Category[];
  onNavigate?: () => void;
}) {
  const { t } = useShopLocale();
  const [open, setOpen] = useState(false);

  const roots = useMemo(() => {
    const cleaned = categories.filter(
      (c) => !isAllCategoryId(c.id) && !isSaleCategoryId(c.id)
    );
    const nested = cleaned.some((c) => (c.children?.length ?? 0) > 0);
    if (nested) {
      return cleaned
        .filter((c) => !c.parentId)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }
    const tops = cleaned.filter((c) => !c.parentId);
    return (tops.length ? tops : cleaned).sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    );
  }, [categories]);

  if (!roots.length) {
    return (
      <Link
        href="/categories"
        onClick={onNavigate}
        className="block px-4 py-3.5 min-h-12 text-sm font-ui font-medium text-luxury-charcoal hover:bg-brand-orange/15 hover:text-brand-orange rounded-xl transition-colors"
      >
        {t("categories")}
      </Link>
    );
  }

  return (
    <div className="rounded-xl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-4 py-3.5 min-h-12",
          "text-sm font-ui font-medium text-luxury-charcoal",
          "hover:bg-brand-orange/15 hover:text-brand-orange rounded-xl transition-colors"
        )}
        aria-expanded={open}
      >
        <span>{t("categories")}</span>
        <ChevronDown
          size={18}
          className={cn(
            "shrink-0 transition-transform duration-200",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>
      {open && (
        <div className="mt-1 space-y-0.5 ps-1" role="tree">
          {roots.map((cat) => (
            <CategoryBranch
              key={cat.id}
              category={cat}
              depth={0}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
