/**
 * PAngV-Grundpreis (EU-Preisangabenverordnung)
 * Berechnet AUSSCHLIESSLICH aus Verkaufspreis + Füllmenge + Einheit.
 * Speichert/ändert keine Produktdaten. Kein manueller Kilo-Preis.
 */

export type NetQuantityUnit = "g" | "kg" | "ml" | "l" | "Stück";

export type BasePriceBase = "kg" | "l" | "Stück";

export interface BasePriceResult {
  /** Grundpreis je Basiseinheit (z. B. 12.00) */
  basePrice: number;
  /** Basiseinheit für die Anzeige */
  base: BasePriceBase;
  /** z. B. "12,00 € / kg" */
  formatted: string;
  /** z. B. "(12,00 € / kg)" */
  formattedParen: string;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatEuroDe(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(roundMoney(value));
}

function normalizeUnit(unit: string): NetQuantityUnit | null {
  const u = unit.trim().toLowerCase();
  if (u === "g" || u === "gram" || u === "gramm") return "g";
  if (u === "kg" || u === "kilogramm") return "kg";
  if (u === "ml" || u === "milliliter") return "ml";
  if (u === "l" || u === "liter" || u === "ltr") return "l";
  if (u === "stück" || u === "stk" || u === "pcs" || u === "pc") return "Stück";
  return null;
}

/**
 * Automatische Grundpreis-Berechnung.
 *
 * Formeln (PAngV):
 * - g:  (Preis / Menge) × 1000  → € / kg
 * - kg:  Preis / Menge          → € / kg
 * - ml: (Preis / Menge) × 1000  → € / l
 * - l:   Preis / Menge          → € / l
 * - Stück: Preis / Menge        → € / Stück
 *
 * @param sellingPrice Aktueller Verkaufspreis (inkl. Rabatt, falls aktiv)
 * @param netQuantity  Füllmenge / Packungsgröße (z. B. 250, 1.5)
 * @param unit         g | kg | ml | l | Stück
 */
export function calculateBasePrice(
  sellingPrice: number,
  netQuantity?: number | null,
  unit?: string | null
): BasePriceResult | null {
  const price = Number(sellingPrice);
  const qty = Number(netQuantity);

  if (!Number.isFinite(price) || price < 0) return null;
  if (netQuantity == null || !Number.isFinite(qty) || qty <= 0) return null;
  if (!unit) return null;

  const u = normalizeUnit(unit);
  if (!u) return null;

  let basePrice: number;
  let base: BasePriceBase;

  switch (u) {
    case "g":
      basePrice = roundMoney((price / qty) * 1000);
      base = "kg";
      break;
    case "kg":
      basePrice = roundMoney(price / qty);
      base = "kg";
      break;
    case "ml":
      basePrice = roundMoney((price / qty) * 1000);
      base = "l";
      break;
    case "l":
      basePrice = roundMoney(price / qty);
      base = "l";
      break;
    case "Stück":
      basePrice = roundMoney(price / qty);
      base = "Stück";
      break;
    default:
      return null;
  }

  if (!Number.isFinite(basePrice)) return null;

  const formatted = `${formatEuroDe(basePrice)} / ${base}`;
  return {
    basePrice,
    base,
    formatted,
    formattedParen: `(${formatted})`,
  };
}

/** Kurzlabel für UI oder null, wenn keine Füllmenge vorliegt */
export function formatBasePriceLabel(
  sellingPrice: number,
  netQuantity?: number | null,
  unit?: string | null,
  withParens = true
): string | null {
  const result = calculateBasePrice(sellingPrice, netQuantity, unit);
  if (!result) return null;
  return withParens ? result.formattedParen : result.formatted;
}
