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
import { CategoryHeading } from "@/components/ShopText";
import { EmptyCategoryNotice } from "@/components/HomeSections";
import JsonLd from "@/components/JsonLd";
import { categoryJsonLd } from "@/lib/seo-jsonld";

export const revalidate = 60;

interface CategoryPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { id } = await params;
  const decoded = decodeURIComponent(id);
  const [category, site] = await Promise.all([
    getCategoryByIdAsync(decoded),
    getSiteConfigAsync(),
  ]);

  if (!category) {
    return { title: `فئة غير موجودة — ${site.name}` };
  }

  const appUrl = getAppUrl();
  const url = `${appUrl}/categories/${category.id}`;
  const bilingual = category.nameEn
    ? `${category.name} / ${category.nameEn}`
    : category.name;
  const title = `${bilingual} — arabische Lebensmittel | ${site.name}`;
  const description = `${bilingual} online kaufen bei ${site.name}: arabische Lebensmittel, Gewürze & Feinkost — frisch, günstig, schnell geliefert.`;

  return {
    title,
    description,
    keywords: [
      category.name,
      category.nameEn,
      "arabische Lebensmittel",
      "Falafel",
      "Online Shop",
      site.name,
    ].filter(Boolean) as string[],
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
  const decoded = decodeURIComponent(id);
  const [category, products, site] = await Promise.all([
    getCategoryByIdAsync(decoded),
    getProductsByCategoryAsync(decoded),
    getSiteConfigAsync(),
  ]);

  if (!category) {
    notFound();
  }

  return (
    <div>
      <JsonLd data={categoryJsonLd(category, products, site)} />
      <div className="bg-gradient-to-r from-gold to-jmle-orange-dark text-white py-10 px-4 text-center">
        <CategoryHeading
          category={category}
          className="font-display text-2xl md:text-3xl tracking-wide"
        />
      </div>
      {category.children && category.children.length > 0 && (
        <CategoryGrid categories={category.children} titleKey="subcategories" />
      )}
      {products.length > 0 ? (
        <ProductGrid products={products} />
      ) : (
        <EmptyCategoryNotice />
      )}
    </div>
  );
}
