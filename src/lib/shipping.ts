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
