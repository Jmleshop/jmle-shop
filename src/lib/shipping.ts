import { roundMoney } from "@/lib/pricing";

/** Schwelle für Gratisversand (EUR, inkl. MwSt. auf Warenkorb-Zwischensumme) */
export const FREE_SHIPPING_THRESHOLD_EUR = 49;

/** Standard-Versandkosten unter der Schwelle */
export const STANDARD_SHIPPING_EUR = 4.99;

export function amountUntilFreeShipping(subtotal: number): number {
  return Math.max(0, roundMoney(FREE_SHIPPING_THRESHOLD_EUR - subtotal));
}

export function qualifiesForFreeShipping(subtotal: number): boolean {
  return subtotal >= FREE_SHIPPING_THRESHOLD_EUR;
}

export function estimateShipping(subtotal: number): number {
  if (subtotal <= 0) return 0;
  return qualifiesForFreeShipping(subtotal)
    ? 0
    : STANDARD_SHIPPING_EUR;
}

/** Füllmenge oder Versandgewicht in Gramm. ml wird wie g behandelt (≈ 1 g/ml). */
export function toGrams(
  value: number | null | undefined,
  unit: string | null | undefined
): number {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const u = (unit || "g").trim().toLowerCase();
  if (u === "kg" || u === "kilogramm") return amount * 1000;
  if (u === "l" || u === "liter" || u === "ltr") return amount * 1000;
  if (u === "mg") return amount / 1000;
  return amount;
}

export function productShippingGrams(product: {
  grossWeightValue?: number | null;
  grossWeightUnit?: string | null;
  weightValue?: number | null;
  weightUnit?: string | null;
}): number {
  const gross = toGrams(product.grossWeightValue, product.grossWeightUnit);
  if (gross > 0) return gross;
  return toGrams(product.weightValue, product.weightUnit);
}

/**
 * Gewichtsbasierter Versand unter der Gratis-Schwelle.
 * Erstes Kilogramm 4,90 €, jedes weitere angefangene kg +1,40 €.
 * Ohne bekanntes Gewicht bleibt der Pauschalpreis.
 */
export function estimateShippingByWeight(subtotal: number, grams: number): number {
  if (subtotal <= 0) return 0;
  if (qualifiesForFreeShipping(subtotal)) return 0;
  if (!Number.isFinite(grams) || grams <= 0) return STANDARD_SHIPPING_EUR;
  const kilos = grams / 1000;
  const extra = Math.max(0, Math.ceil(kilos) - 1);
  return roundMoney(4.9 + extra * 1.4);
}

export function formatWeight(grams: number): string {
  if (grams >= 1000) {
    return `${(grams / 1000).toLocaleString("de-DE", { maximumFractionDigits: 2 })} kg`;
  }
  return `${Math.round(grams)} g`;
}

export function freeShippingProgress(subtotal: number): number {
  if (FREE_SHIPPING_THRESHOLD_EUR <= 0) return 100;
  return Math.min(
    100,
    Math.round((subtotal / FREE_SHIPPING_THRESHOLD_EUR) * 100)
  );
}

/** Enthaltene MwSt. aus Bruttobeträgen (Deutschland) */
export function vatIncludedFromGross(
  gross: number,
  vatRatePercent = 19
): number {
  if (gross <= 0 || vatRatePercent <= 0) return 0;
  return roundMoney(gross - gross / (1 + vatRatePercent / 100));
}
