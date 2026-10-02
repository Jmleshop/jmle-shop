"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { Category } from "@/types";
import { useShopLocale } from "@/components/ShopLocale";
import { categoryTitle } from "@/lib/shop-i18n";
import { cn } from "@/lib/cn";

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

  return (
    <div className="w-full">
      <div
        className={cn(
          "flex items-stretch gap-0.5 rounded-xl",
          depth > 0 && "ms-3 border-s border-orange-100/80 ps-2"
        )}
      >
        <Link
          href={`/categories/${category.id}`}
          onClick={onNavigate}
          className={cn(
            "flex-1 px-3 py-3 min-h-11 text-sm font-ui font-medium text-luxury-charcoal",
            "hover:bg-brand-orange/15 hover:text-brand-orange rounded-xl transition-colors"
          )}
        >
          {label}
        </Link>
        {hasChildren && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 px-2.5 min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl text-luxury-charcoal hover:bg-brand-orange/15 hover:text-brand-orange"
            aria-expanded={open}
            aria-label={open ? "Zuklappen" : "Aufklappen"}
          >
            <ChevronDown
              size={18}
              className={cn(
                "transition-transform duration-200",
                open && "rotate-180"
              )}
              aria-hidden
            />
          </button>
        )}
      </div>
      {hasChildren && open && (
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

/** Ausklappbarer Kategorien-Baum für Burger-Menü. */
export default function CategoryNavTree({
  categories,
  onNavigate,
}: {
  categories: Category[];
  onNavigate?: () => void;
}) {
  const { t } = useShopLocale();
  const [open, setOpen] = useState(false);
  /** Server liefert bereits den Wurzelbaum inkl. children. */
  const roots = useMemo(() => {
    const hasNested = categories.some((c) => (c.children?.length ?? 0) > 0);
    if (hasNested || categories.every((c) => !c.parentId)) return categories;
    return categories.filter((c) => !c.parentId);
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
          <Link
            href="/categories"
            onClick={onNavigate}
            className="block px-3 py-2.5 min-h-10 text-xs font-ui text-gray-500 hover:text-brand-orange rounded-lg"
          >
            {t("allProducts")}
          </Link>
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
