import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getCategoryByIdAsync,
  getProductsByCategoryAsync,
  getSiteConfigAsync,
} from "@/lib/catalog-server";
import { getAppUrl } from "@/lib/site-defaults";
import { ProductGrid } from "@/components/ProductCard";
import CategoryGrid from "@/components/CategoryGrid";

interface CategoryPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { id } = await params;
  const [category, site] = await Promise.all([
    getCategoryByIdAsync(id),
    getSiteConfigAsync(),
  ]);

  if (!category) {
    return { title: `فئة غير موجودة — ${site.name}` };
  }

  const appUrl = getAppUrl();
  const url = `${appUrl}/categories/${category.id}`;
  const title = `${category.name} — ${site.name}`;
  const description = `تسوق منتجات ${category.name}${
    category.nameEn ? ` / ${category.nameEn}` : ""
  } من متجر ${site.name} للمواد الغذائية العربية`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "ar_DE",
      url,
      siteName: site.name,
      title,
      description,
      images: category.image
        ? [{ url: category.image, width: 800, height: 800, alt: category.name }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: category.image ? [category.image] : undefined,
    },
  };
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
        <h1 className="font-display text-2xl md:text-3xl tracking-wide">
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
