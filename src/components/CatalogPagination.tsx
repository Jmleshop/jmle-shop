"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { useShopLocale } from "@/components/ShopLocale";

export default function CatalogPagination({
  page,
  pageCount,
}: {
  page: number;
  pageCount: number;
}) {
  const { t } = useShopLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (pageCount <= 1) return null;

  const hrefFor = (p: number) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (p <= 1) sp.delete("page");
    else sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const prev = page > 1 ? page - 1 : null;
  const next = page < pageCount ? page + 1 : null;

  return (
    <nav
      className="mt-8 flex items-center justify-center gap-2 font-ui"
      aria-label={t("pageOf", { page, pages: pageCount })}
    >
      {prev ? (
        <Link
          href={hrefFor(prev)}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-amber-200 bg-white hover:bg-jmle-warm"
          aria-label={t("pagePrev")}
        >
          <ChevronRight className="rtl:hidden" size={18} aria-hidden />
          <ChevronLeft className="hidden rtl:inline" size={18} aria-hidden />
        </Link>
      ) : (
        <span className="inline-flex min-h-11 min-w-11 opacity-30" aria-hidden />
      )}
      <span className="text-sm text-gray-600 px-2">
        {t("pageOf", { page, pages: pageCount })}
      </span>
      {next ? (
        <Link
          href={hrefFor(next)}
          className={cn(
            "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-amber-200 bg-white hover:bg-jmle-warm"
          )}
          aria-label={t("pageNext")}
        >
          <ChevronLeft className="rtl:hidden" size={18} aria-hidden />
          <ChevronRight className="hidden rtl:inline" size={18} aria-hidden />
        </Link>
      ) : (
        <span className="inline-flex min-h-11 min-w-11 opacity-30" aria-hidden />
      )}
    </nav>
  );
}
