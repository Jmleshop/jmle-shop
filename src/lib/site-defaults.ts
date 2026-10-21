import type { BrandLogo, SiteConfig, Slide } from "@/types";

/** Fallback, falls Supabase site_settings / hero_slides noch leer sind */
export const DEFAULT_SITE_CONFIG: SiteConfig = {
  name: "jmle",
  tagline: "أجود المنتجات العربية",
  currency: "EUR",
  locale: "ar",
  categoriesSectionTitle: "تسوق على حسب الفئة",
  description:
    "متجر jmle للمواد الغذائية العربية الأصيلة — بهارات، أرز، زيوت والمزيد",
};

export const DEFAULT_HERO_SLIDES: Slide[] = [];

export const DEFAULT_BANNER2_SLIDES: Slide[] = [];

export const DEFAULT_BRAND_LOGOS: BrandLogo[] = [];

export { getAppUrl } from "@/lib/app-url";
