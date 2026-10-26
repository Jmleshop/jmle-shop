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
import { absoluteCdnImageUrl } from "@/lib/sharp-image";
import { HomepageSectionsRenderer } from "@/components/HomeSections";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteConfigAsync();
  const slides = await getSlidesAsync();
  const appUrl = getAppUrl();
  const ogImage = absoluteCdnImageUrl(
    site.ogImage || slides[0]?.image,
    1200
  );

  const description =
    site.description ||
    `${site.name}: اطلب المواد الغذائية العربية أونلاين — بهارات، فلافل، أرز وزيوت، أصيلة وتوصيل سريع في ألمانيا.`;

  return {
    title: `${site.name} — مواد غذائية عربية في ألمانيا`,
    description,
    keywords: [
      "مواد غذائية عربية",
      "arabische Lebensmittel",
      "Falafel",
      "Gewürze",
      "arabischer Supermarkt online",
      site.name,
    ],
    alternates: { canonical: appUrl },
    openGraph: {
      type: "website",
      locale: "ar_DE",
      url: appUrl,
      siteName: site.name,
      title: `${site.name} — مواد غذائية عربية في ألمانيا`,
      description,
      ...(ogImage
        ? { images: [{ url: ogImage, width: 1200, height: 630, alt: site.name }] }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${site.name} — مواد غذائية عربية`,
      description,
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
  // Cap homepage “all products” strip — full catalog still available via /shop
  const allProducts = needsAllProducts
    ? (await getProductsAsync()).slice(0, 48)
    : [];

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
