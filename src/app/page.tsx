import type { Metadata } from "next";
import {
  getCategoriesAsync,
  getFeaturedProductsAsync,
  getOffersAsync,
  getRegularProductsAsync,
  getSiteConfigAsync,
  getSlidesAsync,
} from "@/lib/catalog-server";
import { getAppUrl } from "@/lib/site-defaults";
import HeroSlider from "@/components/HeroSlider";
import OffersCarousel from "@/components/OffersCarousel";
import CategoryGrid from "@/components/CategoryGrid";
import { ProductGrid } from "@/components/ProductCard";

// Immer serverseitig frisch rendern, damit importierte Produkte sofort erscheinen.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteConfigAsync();
  const slides = await getSlidesAsync();
  const appUrl = getAppUrl();
  const ogImage = site.ogImage || slides[0]?.image;

  return {
    title: `${site.name} — ${site.tagline}`,
    description:
      site.description ||
      "متجر jmle للمواد الغذائية العربية الأصيلة",
    alternates: { canonical: appUrl },
    openGraph: {
      type: "website",
      locale: "ar_DE",
      url: appUrl,
      siteName: site.name,
      title: `${site.name} — ${site.tagline}`,
      description:
        site.description ||
        "متجر jmle للمواد الغذائية العربية الأصيلة",
      ...(ogImage
        ? { images: [{ url: ogImage, width: 1200, height: 630, alt: site.name }] }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${site.name} — ${site.tagline}`,
      description: site.description || site.tagline,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function HomePage() {
  const [site, slides, categories, featured, offers, regular] =
    await Promise.all([
      getSiteConfigAsync(),
      getSlidesAsync(),
      getCategoriesAsync(),
      getFeaturedProductsAsync(),
      getOffersAsync(),
      getRegularProductsAsync(),
    ]);

  return (
    <>
      <HeroSlider slides={slides} />
      {/* Obere Reihe: nur Rabatt-/Angebotsprodukte */}
      <OffersCarousel products={offers} title="عروض خاصة" />
      {/* Untere Reihe: reguläre / neueste Produkte (Gegenrichtung) */}
      <OffersCarousel products={regular} title="أحدث المنتجات" reverse />
      <CategoryGrid
        categories={categories}
        title={site.categoriesSectionTitle}
      />
      <ProductGrid products={featured} title="عروض ومنتجات" />
    </>
  );
}
