import catalogData from "../../data/products.json";
import type { CatalogData, Slide } from "@/types";

const data = catalogData as CatalogData;

export function getSiteConfig() {
  return data.site;
}

export function getSlides(): Slide[] {
  return data.slider;
}

export function formatPrice(price: number, locale = "ar-DE"): string {
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
