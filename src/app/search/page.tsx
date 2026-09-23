import type { Metadata } from "next";
import {
  getSiteConfigAsync,
  searchProductsAsync,
} from "@/lib/catalog-server";
import { ProductGrid } from "@/components/ProductCard";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
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
  const { q } = await searchParams;
  const query = q?.trim() || "";
  const results = await searchProductsAsync(query, query ? 48 : 24);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
      <h1 className="font-display text-3xl mb-2 tracking-wide">
        {query ? `نتائج البحث: «${q}»` : "البحث"}
      </h1>
      <p className="text-gray-500 text-sm mb-8 font-ui">
        {results.length} {results.length === 1 ? "منتج" : "منتجات"}
      </p>
      {results.length > 0 ? (
        <ProductGrid products={results} />
      ) : (
        <p className="text-center text-gray-400 py-12 font-ui">
          لم يتم العثور على منتجات
        </p>
      )}
    </div>
  );
}
