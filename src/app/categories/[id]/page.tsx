import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getCategoryByIdAsync,
  getCategoryProductsPageAsync,
  getSiteConfigAsync,
} from "@/lib/catalog-server";
import { getAppUrl } from "@/lib/site-defaults";
import { pageFromSearchParam } from "@/lib/pagination";
import { ProductGrid } from "@/components/ProductCard";
import ProductPagination from "@/components/ProductPagination";
import CategoryGrid from "@/components/CategoryGrid";
import { CategoryHeading } from "@/components/ShopText";

export const dynamic = "force-dynamic";

interface CategoryPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
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

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { id } = await params;
  const { page: pageParam } = await searchParams;
  const [category, list] = await Promise.all([
    getCategoryByIdAsync(id),
    getCategoryProductsPageAsync(id, pageFromSearchParam(pageParam)),
  ]);

  if (!category) {
    notFound();
  }

  const { products: items, page, pages } = list;

  return (
    <div>
      <div className="bg-gradient-to-r from-gold to-jmle-orange-dark text-white py-10 px-4 text-center">
        <CategoryHeading
          category={category}
          className="font-display text-2xl md:text-3xl tracking-wide"
        />
      </div>
      {category.children && category.children.length > 0 && (
        <CategoryGrid categories={category.children} titleKey="subcategories" />
      )}
      <ProductGrid products={items} />
      <ProductPagination page={page} pages={pages} href={`/categories/${category.id}`} />
    </div>
  );
}
