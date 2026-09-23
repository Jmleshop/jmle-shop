import type { Metadata } from "next";
import { getSlides, getSiteConfig } from "@/lib/catalog";
import {
  getCategoriesAsync,
  getFeaturedProductsAsync,
} from "@/lib/catalog-server";
import HeroSlider from "@/components/HeroSlider";
import CategoryGrid from "@/components/CategoryGrid";
import { ProductGrid } from "@/components/ProductCard";

const site = getSiteConfig();

export const metadata: Metadata = {
  title: `${site.name} — ${site.tagline}`,
  description: "متجر jmle للمواد الغذائية العربية الأصيلة",
};

export default async function HomePage() {
  const slides = getSlides();
  const [categories, featured] = await Promise.all([
    getCategoriesAsync(),
    getFeaturedProductsAsync(),
  ]);

  return (
    <>
      <HeroSlider slides={slides} />
      <CategoryGrid
        categories={categories}
        title={site.categoriesSectionTitle}
      />
      <ProductGrid products={featured} title="عروض ومنتجات" />
    </>
  );
}
