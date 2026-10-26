import type { SiteConfig } from "@/types";

/** Arabisch mit lateinischen Ziffern (Inhaber-Entscheidung 2026-10-26). */
export function formatPrice(price: number, locale = "ar-DE-u-nu-latn"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

export function formatPriceDe(price: number): string {
  return formatPrice(price, "de-DE");
}

export function calcDiscountPercent(
  price: number,
  originalPrice?: number | null
): number | null {
  if (!originalPrice || originalPrice <= price) return null;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

/** @deprecated Use getSiteConfigAsync from catalog-server */
export function getSiteConfig(): SiteConfig {
  return {
    name: "jmle",
    tagline: "أجود المنتجات العربية",
    currency: "EUR",
    locale: "ar",
    categoriesSectionTitle: "تسوق على حسب الفئة",
  };
}
