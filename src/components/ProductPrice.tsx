import type { Product } from "@/types";
import { formatEuroDe } from "@/lib/pricing";

export function ProductPrice({
  product,
  align = "center",
}: {
  product: Product;
  align?: "center" | "start";
}) {
  const discounted = product.discountPercent > 0;
  const alignCls = align === "center" ? "items-center text-center" : "items-start text-left";

  return (
    <div className={`flex flex-col gap-0.5 ${alignCls}`}>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {discounted && product.originalPrice != null && (
          <span className="text-gray-400 text-xs line-through">
            {formatEuroDe(product.originalPrice)}
          </span>
        )}
        {discounted && (
          <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            -{product.discountPercent}%
          </span>
        )}
        <span
          className={`font-semibold ${discounted ? "text-red-700 text-base" : "text-gold text-sm"}`}
        >
          {formatEuroDe(product.price)}
        </span>
      </div>
      <span className="text-[10px] text-gray-400">
        inkl. {product.vatRate}% MwSt.
      </span>
    </div>
  );
}

export function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) {
    return (
      <span className="bg-gray-800 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
        Ausverkauft
      </span>
    );
  }
  if (stock <= 5) {
    return (
      <span className="bg-amber-100 text-amber-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
        Nur noch {stock} Stück verfügbar
      </span>
    );
  }
  return (
    <span className="bg-green-100 text-green-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
      Auf Lager
    </span>
  );
}
