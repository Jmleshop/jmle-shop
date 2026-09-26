"use client";

import { formatEuroDe } from "@/lib/pricing";
import {
  estimateShippingByWeight,
  formatWeight,
  qualifiesForFreeShipping,
  vatIncludedFromGross,
} from "@/lib/shipping";
import type { AppliedDiscount } from "./DiscountCodeField";
import { cn } from "@/lib/cn";

export default function OrderCostBreakdown({
  subtotal,
  discount,
  weightGrams = 0,
  className,
  showVatNote = true,
}: {
  subtotal: number;
  discount: AppliedDiscount | null;
  weightGrams?: number;
  className?: string;
  showVatNote?: boolean;
}) {
  const discountAmount = Math.min(discount?.amount ?? 0, subtotal);
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const shipping = estimateShippingByWeight(afterDiscount, weightGrams);
  const freeShip = qualifiesForFreeShipping(afterDiscount);
  const total = afterDiscount + shipping;
  const vat7 = vatIncludedFromGross(afterDiscount, 7);
  const vat19 = vatIncludedFromGross(shipping, 19);

  const row = (label: string, value: string, opts?: { strong?: boolean; muted?: boolean }) => (
    <div
      className={cn(
        "flex justify-between gap-4 text-sm font-ui",
        opts?.strong && "font-semibold text-base",
        opts?.muted && "text-gray-500"
      )}
    >
      <span>{label}</span>
      <span className={opts?.strong ? "text-gold" : undefined}>{value}</span>
    </div>
  );

  return (
    <div
      className={cn(
        "rounded-2xl border border-amber-200/50 bg-white/90 p-5 space-y-2.5",
        className
      )}
    >
      {row("المجموع الفرعي / Zwischensumme", formatEuroDe(subtotal))}
      {discountAmount > 0 &&
        row(
          `الخصم / Rabatt (${discount?.code})`,
          `−${formatEuroDe(discountAmount)}`,
          { muted: true }
        )}
      {weightGrams > 0 &&
        row("الوزن / Versandgewicht", formatWeight(weightGrams), { muted: true })}
      {row(
        freeShip
          ? "الشحن / Versand (مجاني)"
          : "الشحن / Versand (nach Gewicht)",
        freeShip ? formatEuroDe(0) : formatEuroDe(shipping)
      )}
      <div className="border-t border-amber-100 pt-3">
        {row("الإجمالي / Gesamt", formatEuroDe(total), { strong: true })}
      </div>
      {showVatNote && (
        <p className="text-[11px] text-gray-400 font-ui pt-1">
          inkl. {formatEuroDe(vat7)} MwSt. (7 % Lebensmittel) 
          {shipping > 0 ? ` und ${formatEuroDe(vat19)} MwSt. (19 % Versand)` : ""}
        </p>
      )}
    </div>
  );
}

export function computeCheckoutTotals(
  subtotal: number,
  discount: AppliedDiscount | null,
  weightGrams = 0
) {
  const discountAmount = Math.min(discount?.amount ?? 0, subtotal);
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const shipping = estimateShippingByWeight(afterDiscount, weightGrams);
  return {
    discountAmount,
    afterDiscount,
    shipping,
    total: afterDiscount + shipping,
  };
}
