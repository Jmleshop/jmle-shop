import type { Metadata } from "next";
import {
  getBanner2SlidesAsync,
  getBrandLogosAsync,
  getBestsellersAsync,
  getHomepageCategoriesAsync,
  getOffersAsync,
  getSiteConfigAsync,
  getSlidesAsync,
} from "@/lib/catalog-server";
import { getAppUrl } from "@/lib/site-defaults";
import CompactBannerSlider from "@/components/CompactBannerSlider";
import BrandLogoTicker from "@/components/BrandLogoTicker";
import OffersCarousel from "@/components/OffersCarousel";
import CategoryGrid from "@/components/CategoryGrid";

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
  const [banner1, brands, banner2, categories, offers, bestsellers] =
    await Promise.all([
      getSlidesAsync(),
      getBrandLogosAsync(),
      getBanner2SlidesAsync(),
      getHomepageCategoriesAsync(),
      getOffersAsync(),
      getBestsellersAsync(),
    ]);

  return (
    <>
      <div className="flex flex-col gap-2 sm:gap-3">
        <CompactBannerSlider slides={banner1} />
        <BrandLogoTicker logos={brands} />
        <CompactBannerSlider slides={banner2} />
      </div>
      <CategoryGrid categories={categories} titleKey="shopByCategory" />
      <OffersCarousel products={offers} titleKey="homeOffers" />
      <OffersCarousel products={bestsellers} titleKey="homeBestsellers" reverse />
    </>
  );
}
