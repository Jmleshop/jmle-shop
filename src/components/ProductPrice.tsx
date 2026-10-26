"use client";

import type { Product } from "@/types";
import { useShopLocale } from "@/components/ShopLocale";
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
  size = "sm",
}: {
  product: Product;
  align?: "center" | "start";
  showUnitPrice?: boolean;
  /** "lg" = große Preisanzeige auf der Produktseite */
  size?: "sm" | "lg";
}) {
  const large = size === "lg";
  const { t } = useShopLocale();
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
        {large ? (
          <span
            className={cn(
              "font-ui font-extrabold tabular-nums leading-none tracking-tight text-4xl md:text-5xl",
              discounted ? "text-red-700" : "text-brand-orange"
            )}
          >
            {formatEuroDe(product.price)}
          </span>
        ) : null}
        {discounted && product.originalPrice != null && (
          <span
            className={cn(
              "text-gray-400 line-through font-ui",
              large ? "text-lg" : "text-xs"
            )}
          >
            {formatEuroDe(product.originalPrice)}
          </span>
        )}
        <DiscountBadge percent={product.discountPercent} />
        {large ? null : (
          <span
            className={cn(
              "font-ui font-semibold",
              discounted ? "text-red-700 text-base" : "text-gold text-sm"
            )}
          >
            {formatEuroDe(product.price)}
          </span>
        )}
      </div>
      <span className={cn("text-gray-400 font-ui", large ? "text-sm mt-1" : "text-xs")}>
        {t("vatIncluded", { rate: product.vatRate })}
      </span>
      {unitLabel && (
        <span
          className="text-xs sm:text-xs text-gray-500 font-ui tabular-nums"
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
      className={cn("text-xs text-gray-500 font-ui tabular-nums", className)}
      aria-label="Grundpreis"
    >
      {label}
    </span>
  );
}

export function StockBadge({ stock }: { stock: number }) {
  const { t } = useShopLocale();
  if (stock <= 0) {
    return (
      <Badge tone="neutral" className="bg-gray-800 text-white border-gray-900/20">
        {t("outShort")}
      </Badge>
    );
  }
  if (stock <= 5) {
    return (
      <Badge tone="gold" title={t("lowStock", { count: stock })}>
        {t("lowStock", { count: stock })}
      </Badge>
    );
  }
  return (
    <Badge tone="success" title={t("inStock")}>
      {t("inStock")}
    </Badge>
  );
}
