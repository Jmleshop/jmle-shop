import {
  calculateBasePrice,
  formatBasePriceLabel,
} from "@/lib/calculateBasePrice";

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function discountedPrice(price: number, discountPercent?: number | null): number {
  const d = Number(discountPercent ?? 0);
  if (!d || d <= 0) return roundMoney(price);
  return roundMoney(Number(price) * (1 - d / 100));
}

export function vatNetFromGross(gross: number, vatRate: number): number {
  return roundMoney(gross / (1 + vatRate / 100));
}

export function vatAmountFromGross(gross: number, vatRate: number): number {
  return roundMoney(gross - vatNetFromGross(gross, vatRate));
}

export function formatEuroDe(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(roundMoney(value));
}

export function stockStatus(quantity: number): "out" | "low" | "ok" {
  if (quantity <= 0) return "out";
  if (quantity <= 5) return "low";
  return "ok";
}

export function maxBuyQuantity(stock: number, maxOrder?: number | null): number {
  // null / 0 / negativ = "Offen" → Limit = aktueller Lagerbestand
  if (maxOrder == null || maxOrder <= 0) {
    return Math.max(0, stock);
  }
  return Math.max(0, Math.min(stock, maxOrder));
}

/** Normiert Nettofüllmenge auf Basiseinheit für PAngV-Grundpreis (€/kg bzw. €/l). */
export function normalizeToBaseUnit(
  value: number,
  unit: string
): { amount: number; base: "kg" | "l" | "stück" } | null {
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) return null;
  const u = unit.trim().toLowerCase();

  if (u === "g" || u === "gram" || u === "gramm") {
    return { amount: v / 1000, base: "kg" };
  }
  if (u === "kg" || u === "kilogramm") {
    return { amount: v, base: "kg" };
  }
  if (u === "ml" || u === "milliliter") {
    return { amount: v / 1000, base: "l" };
  }
  if (u === "l" || u === "liter" || u === "ltr") {
    return { amount: v, base: "l" };
  }
  if (u === "stück" || u === "stk" || u === "pcs" || u === "pc") {
    return { amount: v, base: "stück" };
  }
  return null;
}

export interface UnitPriceResult {
  /** Grundpreis je Basiseinheit (z. B. €/kg) */
  unitPrice: number;
  baseLabel: "kg" | "l" | "Stück";
  /** Formatierter String, z. B. "12,00 € / kg" */
  formatted: string;
}

/**
 * Gesetzliche Grundpreisangabe (PAngV).
 * Nutzt calculateBasePrice — kein manueller Kilo-Preis.
 * @param priceEuro Aktueller Verkaufspreis (bereits rabattiert, falls Rabatt aktiv)
 */
export function calculateUnitPrice(
  priceEuro: number,
  weightValue?: number | null,
  weightUnit?: string | null
): UnitPriceResult | null {
  const result = calculateBasePrice(priceEuro, weightValue, weightUnit);
  if (!result) return null;
  return {
    unitPrice: result.basePrice,
    baseLabel: result.base,
    formatted: result.formatted,
  };
}

/** Kurzform für UI: "(12,00 € / kg)" oder null */
export function formatUnitPriceLabel(
  priceEuro: number,
  weightValue?: number | null,
  weightUnit?: string | null
): string | null {
  return formatBasePriceLabel(priceEuro, weightValue, weightUnit, true);
}

export { calculateBasePrice, formatBasePriceLabel };
