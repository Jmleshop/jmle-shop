"use client";

import { Truck, PartyPopper } from "lucide-react";
import {
  FREE_SHIPPING_THRESHOLD_EUR,
  amountUntilFreeShipping,
  freeShippingProgress,
  qualifiesForFreeShipping,
} from "@/lib/shipping";
import { formatEuroDe } from "@/lib/pricing";
import { cn } from "@/lib/cn";
import { useShopLocale } from "@/components/ShopLocale";

export default function FreeShippingBar({ subtotal }: { subtotal: number }) {
  const { t } = useShopLocale();
  if (subtotal <= 0) return null;

  const free = qualifiesForFreeShipping(subtotal);
  const remaining = amountUntilFreeShipping(subtotal);
  const progress = freeShippingProgress(subtotal);

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 mb-6 transition-colors",
        free
          ? "border-emerald-200 bg-emerald-50/80"
          : "border-amber-200/60 bg-jmle-warm/80"
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3 mb-3">
        {free ? (
          <PartyPopper
            size={22}
            className="text-emerald-600 shrink-0 mt-0.5"
            aria-hidden
          />
        ) : (
          <Truck size={22} className="text-gold shrink-0 mt-0.5" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          {free ? (
            <>
              <p className="font-ui font-semibold text-emerald-800 text-sm">
                {t("freeShipYes")}
              </p>
            </>
          ) : (
            <>
              <p className="font-ui font-medium text-luxury-ink text-sm">
                {t("freeShipRemaining", { amount: formatEuroDe(remaining) })}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 font-ui">
                {t("freeShipHint", { amount: formatEuroDe(FREE_SHIPPING_THRESHOLD_EUR) })}
              </p>
            </>
          )}
        </div>
      </div>

      <div
        className="h-2.5 rounded-full bg-white/80 border border-amber-100 overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-label={t("shippingProgress")}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-boutique",
            free
              ? "bg-emerald-500"
              : "bg-gradient-to-l from-gold to-jmle-yellow"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
