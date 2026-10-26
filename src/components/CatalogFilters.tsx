"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useShopLocale } from "@/components/ShopLocale";
import {
  catalogFiltersToSearchParams,
  catalogHasActiveFilters,
  parseCatalogFilters,
  type CatalogSort,
} from "@/lib/catalog-filters";
import { categoryTitle } from "@/lib/shop-i18n";
import type { BrandLogo, Category } from "@/types";

type CatalogFiltersProps = {
  categories: Category[];
  brands: BrandLogo[];
  /** When set, brand filter is locked (brand page). */
  lockedBrandId?: string;
  className?: string;
  resultCount?: number;
};

const SORT_OPTIONS: CatalogSort[] = [
  "name-ar",
  "name-az",
  "price-asc",
  "price-desc",
];

function sortLabelKey(sort: CatalogSort) {
  switch (sort) {
    case "price-asc":
      return "shopSortPriceAsc" as const;
    case "price-desc":
      return "shopSortPriceDesc" as const;
    case "name-az":
      return "shopSortNameAz" as const;
    case "name-ar":
    default:
      return "shopSortNameAr" as const;
  }
}

export default function CatalogFilters({
  categories,
  brands,
  lockedBrandId,
  className,
  resultCount,
}: CatalogFiltersProps) {
  const { lang, t } = useShopLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const formId = useId();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const searchDebounceRef = useRef<number | null>(null);

  const state = useMemo(
    () =>
      parseCatalogFilters({
        q: searchParams.get("q") ?? undefined,
        category: searchParams.get("category") ?? undefined,
        brand: searchParams.get("brand") ?? lockedBrandId ?? undefined,
        min: searchParams.get("min") ?? undefined,
        max: searchParams.get("max") ?? undefined,
        sort: searchParams.get("sort") ?? undefined,
        page: searchParams.get("page") ?? undefined,
      }),
    [searchParams, lockedBrandId]
  );

  const hasActive = catalogHasActiveFilters(state, {
    ignoreBrand: Boolean(lockedBrandId),
  });

  const flatCategories = useMemo(() => {
    const out: Category[] = [];
    const walk = (nodes: Category[]) => {
      for (const n of nodes) {
        out.push(n);
        if (n.children?.length) walk(n.children);
      }
    };
    walk(categories);
    return out;
  }, [categories]);

  const pushState = (next: Partial<typeof state>) => {
    const merged = { ...state, ...next, page: next.page ?? 1 };
    if (lockedBrandId) merged.brandId = lockedBrandId;
    const sp = catalogFiltersToSearchParams(merged, {
      omitBrand: Boolean(lockedBrandId),
    });
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const clearAll = () => {
    router.push(pathname, { scroll: false });
  };

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current != null) {
        window.clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const filterFields = (
    <div className="space-y-5 font-ui">
      <div>
        <label htmlFor={`${formId}-q`} className="block text-sm font-medium text-luxury-ink mb-1.5">
          {t("search")}
        </label>
        <input
          id={`${formId}-q`}
          type="search"
          defaultValue={state.q}
          key={`q-${state.q}`}
          onChange={(e) => {
            const v = e.target.value;
            if (searchDebounceRef.current != null) {
              window.clearTimeout(searchDebounceRef.current);
            }
            searchDebounceRef.current = window.setTimeout(() => {
              pushState({ q: v.trim().slice(0, 80) });
            }, 320);
          }}
          placeholder={t("searchPlaceholder")}
          className="w-full min-h-11 rounded-xl border border-amber-200/70 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/25 focus:border-gold"
        />
      </div>

      <div>
        <label htmlFor={`${formId}-cat`} className="block text-sm font-medium text-luxury-ink mb-1.5">
          {t("shopCategory")}
        </label>
        <select
          id={`${formId}-cat`}
          value={state.categoryId}
          onChange={(e) => pushState({ categoryId: e.target.value })}
          className="w-full min-h-11 rounded-xl border border-amber-200/70 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/25"
        >
          <option value="">{t("shopAllCategories")}</option>
          {flatCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {categoryTitle(lang, c)}
            </option>
          ))}
        </select>
      </div>

      {!lockedBrandId && (
        <div>
          <label htmlFor={`${formId}-brand`} className="block text-sm font-medium text-luxury-ink mb-1.5">
            {t("shopBrand")}
          </label>
          <select
            id={`${formId}-brand`}
            value={state.brandId}
            onChange={(e) => pushState({ brandId: e.target.value })}
            className="w-full min-h-11 rounded-xl border border-amber-200/70 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/25"
          >
            <option value="">{t("shopAllBrands")}</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <fieldset>
        <legend className="block text-sm font-medium text-luxury-ink mb-1.5">
          {t("shopPrice")} (€)
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor={`${formId}-min`} className="sr-only">
              {t("shopPriceMin")}
            </label>
            <input
              id={`${formId}-min`}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              defaultValue={state.minPrice ?? ""}
              key={`min-${state.minPrice ?? ""}`}
              placeholder={t("shopPriceMin")}
              onBlur={(e) => {
                const raw = e.target.value.trim();
                const n = raw === "" ? null : Number(raw);
                pushState({
                  minPrice: n != null && Number.isFinite(n) && n >= 0 ? n : null,
                });
              }}
              className="w-full min-h-11 rounded-xl border border-amber-200/70 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/25"
            />
          </div>
          <div>
            <label htmlFor={`${formId}-max`} className="sr-only">
              {t("shopPriceMax")}
            </label>
            <input
              id={`${formId}-max`}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              defaultValue={state.maxPrice ?? ""}
              key={`max-${state.maxPrice ?? ""}`}
              placeholder={t("shopPriceMax")}
              onBlur={(e) => {
                const raw = e.target.value.trim();
                const n = raw === "" ? null : Number(raw);
                pushState({
                  maxPrice: n != null && Number.isFinite(n) && n >= 0 ? n : null,
                });
              }}
              className="w-full min-h-11 rounded-xl border border-amber-200/70 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/25"
            />
          </div>
        </div>
      </fieldset>

      <div>
        <label htmlFor={`${formId}-sort`} className="block text-sm font-medium text-luxury-ink mb-1.5">
          {t("shopSort")}
        </label>
        <select
          id={`${formId}-sort`}
          value={state.sort}
          onChange={(e) => pushState({ sort: e.target.value as CatalogSort })}
          className="w-full min-h-11 rounded-xl border border-amber-200/70 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/25"
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {t(sortLabelKey(s))}
            </option>
          ))}
        </select>
      </div>

      {hasActive && (
        <button
          type="button"
          onClick={clearAll}
          className="w-full min-h-11 rounded-xl border border-amber-200 bg-jmle-warm/60 text-sm text-luxury-ink hover:bg-jmle-warm transition-colors"
        >
          {t("shopClearFilters")}
        </button>
      )}
    </div>
  );

  return (
    <div className={cn("font-ui", className)}>
      <div className="flex flex-wrap items-center gap-2 mb-4 lg:mb-0">
        {typeof resultCount === "number" && (
          <p className="text-sm text-gray-600" aria-live="polite">
            {t("shopResults", { count: resultCount })}
            {hasActive ? (
              <span className="ms-2 inline-flex items-center rounded-full bg-gold/15 px-2 py-0.5 text-xs text-gold">
                {t("shopActiveFilters")}
              </span>
            ) : null}
          </p>
        )}
        <button
          type="button"
          className="lg:hidden ms-auto inline-flex items-center gap-2 min-h-11 px-3 rounded-full border border-amber-200 bg-white text-sm shadow-sm"
          aria-expanded={drawerOpen}
          aria-controls={`${formId}-drawer`}
          onClick={() => setDrawerOpen(true)}
        >
          <Filter size={16} aria-hidden />
          {t("shopOpenFilters")}
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:block rounded-2xl border border-amber-100/80 bg-white/90 p-4 shadow-sm"
        aria-label={t("shopFilters")}
      >
        <h2 className="text-base font-display text-luxury-ink mb-4">
          {t("shopFilters")}
        </h2>
        {filterFields}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={t("shopFilters")}>
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label={t("shopCloseFilters")}
            onClick={() => setDrawerOpen(false)}
          />
          <div
            id={`${formId}-drawer`}
            className="absolute inset-y-0 end-0 w-[min(100%,22rem)] bg-white shadow-xl p-4 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-display text-luxury-ink">
                {t("shopFilters")}
              </h2>
              <button
                type="button"
                className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-full hover:bg-jmle-warm"
                aria-label={t("shopCloseFilters")}
                onClick={() => setDrawerOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            {filterFields}
            <button
              type="button"
              className="mt-4 w-full min-h-11 rounded-xl bg-gold text-white text-sm"
              onClick={() => setDrawerOpen(false)}
            >
              {t("shopCloseFilters")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
