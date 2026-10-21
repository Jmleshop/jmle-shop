import type { Metadata } from "next";
import {
  getSiteConfigAsync,
  searchProductsAsync,
} from "@/lib/catalog-server";
import { PRODUCT_PAGE_SIZE, pageFromSearchParam } from "@/lib/pagination";
import { ProductGrid } from "@/components/ProductCard";
import ProductPagination from "@/components/ProductPagination";
import { ShopHeading } from "@/components/ShopText";

export const dynamic = "force-dynamic";

interface SearchPageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const site = await getSiteConfigAsync();
  const query = q?.trim();
  return {
    title: query
      ? `نتائج البحث: ${query} — ${site.name}`
      : `البحث — ${site.name}`,
    description: query
      ? `نتائج البحث عن «${query}» في متجر ${site.name}`
      : `ابحث عن المنتجات العربية في متجر ${site.name}`,
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, page: pageParam } = await searchParams;
  const query = q?.trim() || "";
  const page = pageFromSearchParam(pageParam);
  const fetched = await searchProductsAsync(query, PRODUCT_PAGE_SIZE + 1, (page - 1) * PRODUCT_PAGE_SIZE);
  const items = fetched.slice(0, PRODUCT_PAGE_SIZE);
  const pages = fetched.length > PRODUCT_PAGE_SIZE ? page + 1 : page;
  const total = items.length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
      {query ? (
        <ShopHeading
          k="searchResults"
          vars={{ query }}
          className="font-display text-3xl mb-2 tracking-wide"
        />
      ) : (
        <ShopHeading k="search" className="font-display text-3xl mb-2 tracking-wide" />
      )}
      <ShopHeading
        as="p"
        k="productCount"
        vars={{ count: total }}
        className="text-gray-500 text-sm mb-8 font-ui"
      />
      {items.length > 0 ? (
        <>
          <ProductGrid products={items} />
          <ProductPagination
            page={page}
            pages={pages}
            href="/search"
            query={{ q: query || undefined }}
          />
        </>
      ) : (
        <ShopHeading as="p" k="searchEmpty" className="text-center text-gray-400 py-12 font-ui" />
      )}
    </div>
  );
}
