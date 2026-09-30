"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useShopLocale } from "@/components/ShopLocale";
import { cn } from "@/lib/cn";

type ProductPaginationProps = {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
};

function pageWindow(page: number, pageCount: number): number[] {
  if (pageCount <= 5) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const start = Math.max(1, Math.min(page - 1, pageCount - 4));
  return Array.from({ length: 5 }, (_, i) => start + i);
}

export default function ProductPagination({
  page,
  pageCount,
  onChange,
}: ProductPaginationProps) {
  const { t } = useShopLocale();
  if (pageCount <= 1) return null;
  const pages = pageWindow(page, pageCount);

  return (
    <nav
      className="mt-8 flex flex-wrap items-center justify-center gap-2"
      aria-label={t("pageOf", { page, pages: pageCount })}
    >
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-orange-200/80 bg-white px-3 text-sm font-ui font-medium text-luxury-charcoal transition-colors hover:border-brand-orange/40 hover:text-brand-orange disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft size={16} className="rtl:rotate-180" aria-hidden />
        {t("pagePrev")}
      </button>

      <div className="flex items-center gap-1">
        {pages.map((n) => (
          <button
            key={n}
            type="button"
            aria-label={t("pageLabel", { n })}
            aria-current={n === page ? "page" : undefined}
            onClick={() => onChange(n)}
            className={cn(
              "min-h-11 min-w-11 rounded-xl text-sm font-ui font-semibold tabular-nums transition-colors",
              n === page
                ? "bg-brand-orange text-white shadow-gold-sm"
                : "border border-orange-200/70 bg-white text-luxury-charcoal hover:border-brand-orange/40 hover:text-brand-orange"
            )}
          >
            {n}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
        className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-orange-200/80 bg-white px-3 text-sm font-ui font-medium text-luxury-charcoal transition-colors hover:border-brand-orange/40 hover:text-brand-orange disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t("pageNext")}
        <ChevronRight size={16} className="rtl:rotate-180" aria-hidden />
      </button>
    </nav>
  );
}
