"use client";

import { Suspense } from "react";
import ProductCard from "@/components/ProductCard";
import CatalogFilters from "@/components/CatalogFilters";
import CatalogPagination from "@/components/CatalogPagination";
import { ShopHeading } from "@/components/ShopText";
import type { BrandLogo, Category, Product } from "@/types";

type CatalogShopProps = {
  products: Product[];
  total: number;
  page: number;
  pageCount: number;
  categories: Category[];
  brands: BrandLogo[];
  lockedBrandId?: string;
  headingKey?: "allProducts" | "searchResults" | "brandProducts";
  headingVars?: Record<string, string | number>;
};

function CatalogShopInner({
  products,
  total,
  page,
  pageCount,
  categories,
  brands,
  lockedBrandId,
  headingKey = "allProducts",
  headingVars,
}: CatalogShopProps) {
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-6 md:py-10">
      <div className="mb-6 text-center lg:text-start">
        <ShopHeading
          k={headingKey}
          vars={headingVars}
          className="font-display text-2xl md:text-3xl tracking-wide text-luxury-ink"
        />
      </div>

      <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-8 lg:items-start">
        <CatalogFilters
          categories={categories}
          brands={brands}
          lockedBrandId={lockedBrandId}
          resultCount={total}
          className="mb-4 lg:mb-0 lg:sticky lg:top-24"
        />

        <div>
          {products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <CatalogPagination page={page} pageCount={pageCount} />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-amber-200/80 bg-white/70 px-4 py-16 text-center">
              <ShopHeading
                as="p"
                k={total === 0 ? "shopNoMatch" : "noProducts"}
                className="font-ui text-base text-luxury-charcoal"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Suspense boundary required for useSearchParams in filters/pagination. */
export default function CatalogShop(props: CatalogShopProps) {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-16 text-center font-ui text-gray-500">
          …
        </div>
      }
    >
      <CatalogShopInner {...props} />
    </Suspense>
  );
}
