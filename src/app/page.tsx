import type { Metadata } from "next";
import {
  getBanner2SlidesAsync,
  getBanner3SlidesAsync,
  getBrandLogosAsync,
  getBestsellersAsync,
  getHomepageCategoriesAsync,
  getOffersAsync,
  getSiteConfigAsync,
  getSlidesAsync,
} from "@/lib/catalog-server";
import { getAppUrl } from "@/lib/site-defaults";
import BrandLogoTicker from "@/components/BrandLogoTicker";
import OffersCarousel from "@/components/OffersCarousel";
import CategoryGrid from "@/components/CategoryGrid";
import { BannerSection } from "@/components/HomeSections";

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
  const [banner1, brands, banner2, banner3, categories, offers, bestsellers, site] =
    await Promise.all([
      getSlidesAsync(),
      getBrandLogosAsync(),
      getBanner2SlidesAsync(),
      getBanner3SlidesAsync(),
      getHomepageCategoriesAsync(),
      getOffersAsync(),
      getBestsellersAsync(),
      getSiteConfigAsync(),
    ]);

  return (
    <>
      <div className="flex flex-col">
        <BannerSection slides={banner1} size="hero" />
        <BrandLogoTicker logos={brands} title={site.brandsSectionTitle} />
        <BannerSection slides={banner2} title={site.banner2SectionTitle} />
        <BannerSection slides={banner3} title={site.banner3SectionTitle} />
      </div>
      <CategoryGrid
        categories={categories}
        title={site.categoriesSectionTitle}
      />
      <OffersCarousel products={offers} titleKey="homeOffers" />
      <OffersCarousel products={bestsellers} titleKey="homeBestsellers" reverse />
    </>
  );
}
