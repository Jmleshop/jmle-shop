import type { BrandLogo, SiteConfig, Slide } from "@/types";
import { DEFAULT_HOMEPAGE_SECTIONS } from "@/lib/homepage-sections";

/** Fallback, falls Supabase site_settings / hero_slides noch leer sind */
export const DEFAULT_SITE_CONFIG: SiteConfig = {
  name: "jmle",
  tagline: "أجود المنتجات العربية",
  currency: "EUR",
  locale: "ar",
  categoriesSectionTitle: "تسوق على حسب الفئة",
  brandsSectionTitle: "",
  banner2SectionTitle: "",
  banner3SectionTitle: "",
  zoneLabels: {
    banner1: "Hero Banner 1",
    brands: "Marken-Logos",
    banner2: "Banner 2",
    banner3: "Banner 3",
  },
  homepageSections: DEFAULT_HOMEPAGE_SECTIONS,
  description:
    "متجر jmle للمواد الغذائية العربية الأصيلة — بهارات، أرز، زيوت والمزيد",
  productWatermarkEnabled: false,
  productWatermarkLogo: "",
  productWatermarkOpacity: 0.38,
  productWatermarkScale: 0.22,
  productWatermarkPosition: "bottom-right",
};

export const DEFAULT_HERO_SLIDES: Slide[] = [
  {
    id: "slide-1",
    image:
      "https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=1600&q=80",
    title: "بهارات وتوابل أصيلة",
    subtitle: "نكهات من المطبخ العربي مباشرة إلى منزلك",
    titleAr: "بهارات وتوابل أصيلة",
    titleDe: "Authentische Gewürze",
    subtitleAr: "نكهات من المطبخ العربي مباشرة إلى منزلك",
    subtitleDe: "Aromen der arabischen Küche direkt zu dir nach Hause",
    sliderZone: "banner1",
    linkUrl: "/categories",
  },
  {
    id: "slide-2",
    image:
      "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=1600&q=80",
    title: "أرز فاخر بأنواعه",
    subtitle: "بسمتي، مصري، وأسمر — جودة ممتازة",
    titleAr: "أرز فاخر بأنواعه",
    titleDe: "Premium-Reis in vielen Sorten",
    subtitleAr: "بسمتي، مصري، وأسمر — جودة ممتازة",
    subtitleDe: "Basmati, ägyptisch und Vollkorn — Top-Qualität",
    sliderZone: "banner1",
    linkUrl: "/products",
  },
  {
    id: "slide-3",
    image:
      "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=1600&q=80",
    title: "زيوت طبيعية نقية",
    subtitle: "زيت زيتون، سمسم، ودوار الشمس",
    titleAr: "زيوت طبيعية نقية",
    titleDe: "Natürliche Öle",
    subtitleAr: "زيت زيتون، سمسم، ودوار الشمس",
    subtitleDe: "Olivenöl, Sesam und Sonnenblume",
    sliderZone: "banner1",
    linkCategoryId: "sale",
  },
];

export const DEFAULT_BANNER2_SLIDES: Slide[] = [];

export const DEFAULT_BRAND_LOGOS: BrandLogo[] = [];

export { getAppUrl } from "@/lib/app-url";
