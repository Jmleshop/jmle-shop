"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { Category } from "@/types";
import { useShopLocale } from "@/components/ShopLocale";
import { categoryTitle } from "@/lib/shop-i18n";
import { cn } from "@/lib/cn";
import { isAllCategoryId, isSaleCategoryId } from "@/lib/category-special";

function CategoryBranch({
  category,
  depth,
  onNavigate,
}: {
  category: Category;
  depth: number;
  onNavigate?: () => void;
}) {
  const { lang, t } = useShopLocale();
  const children = category.children ?? [];
  const hasChildren = children.length > 0;
  const [open, setOpen] = useState(false);
  const label = categoryTitle(lang, category);

  // Unterkategorien: nur Link (kein Auto-Expand)
  if (!hasChildren) {
    return (
      <Link
        href={`/categories/${category.id}`}
        onClick={onNavigate}
        className={cn(
          "block px-3 py-3 min-h-11 text-sm font-ui font-medium text-luxury-charcoal",
          "hover:bg-brand-orange/15 hover:text-brand-orange rounded-xl transition-colors",
          depth > 0 && "ms-3 border-s border-orange-100/80 ps-3"
        )}
      >
        {label}
      </Link>
    );
  }

  // Kategorie mit Kindern: Name navigiert, nur der Pfeil klappt auf
  const groupId = `cat-children-${category.id}`;
  return (
    <div className="w-full" role="none">
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
            "flex-1 flex items-center px-3 py-3 min-h-11 text-start",
            "text-sm font-ui font-medium text-luxury-charcoal",
            "hover:bg-brand-orange/15 hover:text-brand-orange rounded-xl transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50"
          )}
        >
          {label}
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl text-gray-500 hover:bg-brand-orange/15 hover:text-brand-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50"
          aria-expanded={open}
          aria-controls={groupId}
          aria-label={t(open ? "collapseSubcategories" : "expandSubcategories", { name: label })}
        >
          <ChevronDown
            size={18}
            className={cn(
              "shrink-0 transition-transform duration-200 motion-reduce:transition-none",
              open && "rotate-180"
            )}
            aria-hidden
          />
        </button>
      </div>
      {open && (
        <div id={groupId} className="mt-0.5 space-y-0.5">
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

/** Ausklappbarer Kategorien-Baum — nur echte DB-Hauptkategorien. */
export default function CategoryNavTree({
  categories,
  onNavigate,
  defaultOpen = false,
}: {
  categories: Category[];
  onNavigate?: () => void;
  /** Hauptkategorien sofort sichtbar (Burger-Menü) */
  defaultOpen?: boolean;
}) {
  const { t } = useShopLocale();
  const [open, setOpen] = useState(defaultOpen);

  const roots = useMemo(() => {
    const cleaned = categories.filter(
      (c) => !isAllCategoryId(c.id) && !isSaleCategoryId(c.id)
    );
    // Server liefert i. d. R. bereits den Wurzelbaum
    const nested = cleaned.some((c) => (c.children?.length ?? 0) > 0);
    if (nested) {
      return cleaned.filter((c) => !c.parentId);
    }
    const tops = cleaned.filter((c) => !c.parentId);
    return tops.length ? tops : cleaned;
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
        aria-controls="cat-nav-roots"
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
        <div id="cat-nav-roots" className="mt-1 space-y-0.5 ps-1">
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
