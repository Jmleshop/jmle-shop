import type { Metadata } from "next";
import {
  getBestsellersAsync,
  getBrandLogosAsync,
  getHomepageCategoriesAsync,
  getHomepageSectionsAsync,
  getOffersAsync,
  getProductsAsync,
  getSiteConfigAsync,
  getSlidesAsync,
  getSlidesByZoneAsync,
} from "@/lib/catalog-server";
import { getAppUrl } from "@/lib/site-defaults";
import { HomepageSectionsRenderer } from "@/components/HomeSections";

export const revalidate = 60;

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
  const [sections, slidesByZone, brands, categories, offers, bestsellers] =
    await Promise.all([
      getHomepageSectionsAsync(),
      getSlidesByZoneAsync(),
      getBrandLogosAsync(),
      getHomepageCategoriesAsync(),
      getOffersAsync(),
      getBestsellersAsync(),
    ]);

  // Only hydrate the full catalog into the client tree when a section asks for it.
  const needsAllProducts = sections.some(
    (s) => s.type === "products" && s.productSource === "all"
  );
  const allProducts = needsAllProducts ? await getProductsAsync() : [];

  return (
    <HomepageSectionsRenderer
      sections={sections}
      slidesByZone={slidesByZone}
      brands={brands}
      categories={categories}
      offers={offers}
      bestsellers={bestsellers}
      allProducts={allProducts}
    />
  );
}
