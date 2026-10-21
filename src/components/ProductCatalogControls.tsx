"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { useShopLocale } from "@/components/ShopLocale";
import type { ProductSort } from "@/lib/catalog-server";

const SORTS: ProductSort[] = ["popular", "price_asc", "price_desc", "newest"];

function isSort(value: string | null): value is ProductSort {
  return SORTS.includes(value as ProductSort);
}

export default function ProductCatalogControls({ children }: { children: React.ReactNode }) {
  const { t } = useShopLocale();
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const sort: ProductSort = isSort(params.get("sort")) ? (params.get("sort") as ProductSort) : "popular";
  const min = params.get("min") ?? "";
  const max = params.get("max") ?? "";
  const sale = params.get("sale") === "1";
  const stock = params.get("stock") === "1";
  const active = sort !== "popular" || min !== "" || max !== "" || sale || stock;

  const push = (next: Record<string, string | null>) => {
    const query = new URLSearchParams(params.toString());
    query.delete("page");
    for (const [key, value] of Object.entries(next)) {
      if (!value) query.delete(key);
      else query.set(key, value);
    }
    const qs = query.toString();
    router.push(qs ? `/products?${qs}` : "/products");
  };

  const sortSelect = (
    <select
      value={sort}
      onChange={(e) => push({ sort: e.target.value === "popular" ? null : e.target.value })}
      className="min-h-11 w-full rounded-xl border border-amber-200 bg-white px-3 font-ui text-sm text-luxury-ink md:w-56"
      aria-label={t("sortLabel")}
    >
      <option value="popular">{t("sortPopular")}</option>
      <option value="price_asc">{t("sortPriceAsc")}</option>
      <option value="price_desc">{t("sortPriceDesc")}</option>
      <option value="newest">{t("sortNewest")}</option>
    </select>
  );

  const fields = (
    <div className="space-y-5 text-start">
      <div className="md:hidden">{sortSelect}</div>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          push({
            min: String(data.get("min") || "") || null,
            max: String(data.get("max") || "") || null,
            sale: data.get("sale") ? "1" : null,
            stock: data.get("stock") ? "1" : null,
          });
          setOpen(false);
        }}
      >
        <fieldset>
          <legend className="mb-2 font-ui text-sm font-semibold text-luxury-ink">{t("filterPrice")}</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs font-ui text-luxury-charcoal/70">
              {t("filterMin")}
              <input
                name="min"
                type="number"
                min={0}
                step="0.01"
                defaultValue={min}
                className="mt-1 w-full min-h-11 rounded-xl border border-amber-200 px-3 text-sm"
              />
            </label>
            <label className="block text-xs font-ui text-luxury-charcoal/70">
              {t("filterMax")}
              <input
                name="max"
                type="number"
                min={0}
                step="0.01"
                defaultValue={max}
                className="mt-1 w-full min-h-11 rounded-xl border border-amber-200 px-3 text-sm"
              />
            </label>
          </div>
        </fieldset>
        <label className="flex min-h-11 items-center gap-2 font-ui text-sm text-luxury-ink">
          <input type="checkbox" name="sale" defaultChecked={sale} className="h-4 w-4 accent-brand-orange" />
          {t("filterSale")}
        </label>
        <label className="flex min-h-11 items-center gap-2 font-ui text-sm text-luxury-ink">
          <input type="checkbox" name="stock" defaultChecked={stock} className="h-4 w-4 accent-brand-orange" />
          {t("filterStock")}
        </label>
        <button
          type="submit"
          className="min-h-11 w-full rounded-xl bg-brand-orange font-ui text-sm text-white"
        >
          {t("filterApply")}
        </button>
      </form>
      {active && (
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            router.push("/products");
          }}
          className="min-h-11 w-full rounded-xl border border-amber-200 font-ui text-sm text-luxury-ink"
        >
          {t("filterReset")}
        </button>
      )}
    </div>
  );

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:grid-cols-[16rem_1fr] md:px-8">
      <div className="flex items-center justify-between gap-3 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-200 bg-white px-4 font-ui text-sm text-luxury-ink"
        >
          <SlidersHorizontal size={18} aria-hidden />
          {t("filterSort")}
        </button>
      </div>

      <aside className="hidden md:block">{fields}</aside>
      <div>
        <div className="mb-2 hidden justify-end md:flex">{sortSelect}</div>
        {children}
      </div>

      {open && (
        <div className="fixed inset-0 z-[70] md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label={t("close")}
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-jmle-cream p-5 pb-28 shadow-boutique">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-ui text-base font-semibold text-luxury-ink">{t("filterSort")}</p>
              <button type="button" onClick={() => setOpen(false)} className="min-h-11 min-w-11" aria-label={t("close")}>
                <X size={20} className="ms-auto" />
              </button>
            </div>
            {fields}
          </div>
        </div>
      )}
    </div>
  );
}
