import { notFound } from "next/navigation";
import {
  getCategoryByIdAsync,
  getProductsByCategoryAsync,
} from "@/lib/catalog-server";
import { ProductGrid } from "@/components/ProductCard";
import CategoryGrid from "@/components/CategoryGrid";

interface CategoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { id } = await params;
  const [category, products] = await Promise.all([
    getCategoryByIdAsync(id),
    getProductsByCategoryAsync(id),
  ]);

  if (!category) {
    notFound();
  }

  return (
    <div>
      <div className="bg-gradient-to-r from-gold to-jmle-orange-dark text-white py-10 px-4 text-center">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-wide">
          {category.name}
        </h1>
      </div>
      {category.children && category.children.length > 0 && (
        <CategoryGrid categories={category.children} title="الفئات الفرعية" />
      )}
      <ProductGrid products={products} />
    </div>
  );
}
