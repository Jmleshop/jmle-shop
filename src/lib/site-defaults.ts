import type { SiteConfig, Slide } from "@/types";

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

export const DEFAULT_HERO_SLIDES: Slide[] = [
  {
    id: "slide-1",
    image:
      "https://images.unsplash.com/photo-1596040033229-a0b517a33173?w=1600&q=80",
    title: "بهارات وتوابل أصيلة",
    subtitle: "نكهات من المطبخ العربي مباشرة إلى منزلك",
  },
  {
    id: "slide-2",
    image:
      "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=1600&q=80",
    title: "أرز فاخر بأنواعه",
    subtitle: "بسمتي، مصري، وأسمر — جودة ممتازة",
  },
  {
    id: "slide-3",
    image:
      "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=1600&q=80",
    title: "زيوت طبيعية نقية",
    subtitle: "زيت زيتون، سمسم، ودوار الشمس",
  },
];

export function getAppUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").trim();
  return raw.replace(/\/$/, "");
}
