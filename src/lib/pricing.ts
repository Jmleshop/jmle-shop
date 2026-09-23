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
  const cap = maxOrder && maxOrder > 0 ? maxOrder : 99;
  return Math.max(0, Math.min(stock, cap));
}
