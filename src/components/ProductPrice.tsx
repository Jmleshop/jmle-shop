import type { Product } from "@/types";
import { formatEuroDe, formatBasePriceLabel } from "@/lib/pricing";
import { DiscountBadge, Badge } from "@/components/ui";
import { cn } from "@/lib/cn";

/**
 * Preisanzeige inkl. automatischem PAngV-Grundpreis.
 * product.price ist bereits der Verkaufspreis (rabattiert, falls Rabatt aktiv).
 */
export function ProductPrice({
  product,
  align = "center",
  showUnitPrice = true,
}: {
  product: Product;
  align?: "center" | "start";
  showUnitPrice?: boolean;
}) {
  const discounted = product.discountPercent > 0;
  const alignCls =
    align === "center" ? "items-center text-center" : "items-start text-start";

  // Verkaufspreis (discounted) + Füllmenge → automatischer Grundpreis
  const unitLabel = showUnitPrice
    ? formatBasePriceLabel(
        product.price,
        product.weightValue,
        product.weightUnit,
        true
      )
    : null;

  return (
    <div className={cn("flex flex-col gap-0.5", alignCls)}>
      <div
        className={cn(
          "flex flex-wrap items-center gap-2",
          align === "center" && "justify-center"
        )}
      >
        {discounted && product.originalPrice != null && (
          <span className="text-gray-400 text-xs line-through font-ui">
            {formatEuroDe(product.originalPrice)}
          </span>
        )}
        <DiscountBadge percent={product.discountPercent} />
        <span
          className={cn(
            "font-ui font-semibold",
            discounted ? "text-red-700 text-base" : "text-gold text-sm"
          )}
        >
          {formatEuroDe(product.price)}
        </span>
      </div>
      <span className="text-[10px] text-gray-400 font-ui">
        inkl. {product.vatRate}% MwSt.
      </span>
      {unitLabel && (
        <span
          className="text-[10px] sm:text-[11px] text-gray-500 font-ui tabular-nums"
          aria-label="Grundpreis"
        >
          {unitLabel}
        </span>
      )}
    </div>
  );
}

/** Nur Grundpreis-Zeile (Warenkorb / Checkout) */
export function BasePriceHint({
  product,
  className,
}: {
  product: Pick<Product, "price" | "weightValue" | "weightUnit">;
  className?: string;
}) {
  const label = formatBasePriceLabel(
    product.price,
    product.weightValue,
    product.weightUnit,
    true
  );
  if (!label) return null;
  return (
    <span
      className={cn("text-[10px] text-gray-500 font-ui tabular-nums", className)}
      aria-label="Grundpreis"
    >
      {label}
    </span>
  );
}

export function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) {
    return (
      <Badge tone="neutral" className="bg-gray-800 text-white border-gray-900/20">
        نفذ
      </Badge>
    );
  }
  if (stock <= 5) {
    return (
      <Badge tone="gold" title={`Nur noch ${stock}`}>
        متبقي {stock}
      </Badge>
    );
  }
  return (
    <Badge tone="success" title="Auf Lager">
      متوفر
    </Badge>
  );
}
