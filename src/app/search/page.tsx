import { getProductsAsync } from "@/lib/catalog-server";
import { ProductGrid } from "@/components/ProductCard";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = q?.trim().toLowerCase() || "";
  const allProducts = await getProductsAsync();

  const results = query
    ? allProducts.filter((p) => {
        const haystack = `${p.name} ${p.nameDe ?? ""} ${p.description}`.toLowerCase();
        return haystack.includes(query);
      })
    : allProducts;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
      <h1 className="text-3xl font-light mb-2 tracking-wide">
        {query ? `نتائج البحث: "${q}"` : "البحث"}
      </h1>
      <p className="text-gray-500 text-sm mb-8">
        {results.length} {results.length === 1 ? "منتج" : "منتجات"}
      </p>
      {results.length > 0 ? (
        <ProductGrid products={results} />
      ) : (
        <p className="text-center text-gray-400 py-12">لم يتم العثور على منتجات</p>
      )}
    </div>
  );
}
