"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { productShippingGrams } from "@/lib/shipping";
import { formatPrice } from "@/lib/catalog";
import { BasePriceHint } from "@/components/ProductPrice";
import FreeShippingBar from "@/components/cart/FreeShippingBar";
import DiscountCodeField, {
  type AppliedDiscount,
} from "@/components/cart/DiscountCodeField";
import OrderCostBreakdown, {
  computeCheckoutTotals,
} from "@/components/cart/OrderCostBreakdown";
import { Button } from "@/components/ui";
import { toast } from "@/components/AppToaster";
import { useShopLocale } from "@/components/ShopLocale";
import { productTitle } from "@/lib/shop-i18n";

const DISCOUNT_STORAGE_KEY = "jmle_cart_discount";

export default function CheckoutPage() {
  const { items, total, loading } = useCart();
  const { lang, t } = useShopLocale();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [discount, setDiscount] = useState<AppliedDiscount | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DISCOUNT_STORAGE_KEY);
      if (raw) setDiscount(JSON.parse(raw) as AppliedDiscount);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (discount) {
      sessionStorage.setItem(DISCOUNT_STORAGE_KEY, JSON.stringify(discount));
    } else {
      sessionStorage.removeItem(DISCOUNT_STORAGE_KEY);
    }
  }, [discount]);

  useEffect(() => {
    if (!discount) return;
    if (discount.type === "percent") {
      const amount =
        Math.round(((total * discount.value) / 100) * 100) / 100;
      if (amount !== discount.amount) {
        setDiscount({ ...discount, amount });
      }
    } else if (discount.amount > total) {
      setDiscount({ ...discount, amount: total });
    }
  }, [total, discount]);

  const handleCheckout = async () => {
    setProcessing(true);
    setError("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.product_id,
            quantity: item.quantity,
          })),
          discountCode: discount?.code,
          lang,
        }),
      });

      const data = await response.json();

      if (data.url) {
        toast.success(t("stripeRedirect"));
        window.location.href = data.url;
      } else {
        const msg = data.error || t("stripeError");
        setError(msg);
        toast.error(msg);
        setProcessing(false);
      }
    } catch {
      setError(t("stripeConnectError"));
      toast.error(t("stripeConnectError"));
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-gray-400 font-ui">{t("loading")}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center px-4">
        <h1 className="font-display text-2xl mb-4">{t("noCheckoutItems")}</h1>
        <Link href="/" className="btn-primary">
          {t("backToShop")}
        </Link>
      </div>
    );
  }

  const weightGrams = items.reduce(
    (sum, item) => sum + productShippingGrams(item.product ?? {}) * item.quantity,
    0
  );
  const { total: grandTotal } = computeCheckoutTotals(total, discount, weightGrams);

  return (
    <div className="max-w-lg mx-auto px-4 py-8 md:py-12 animate-fade-up">
      <h1 className="font-display text-3xl mb-6 tracking-wide">{t("checkoutTitle")}</h1>

      <FreeShippingBar subtotal={total} />

      <div className="bg-white rounded-2xl border border-amber-200/50 p-5 shadow-sm mb-4 space-y-3">
        <h2 className="text-sm font-ui font-medium text-gold mb-1">
          {t("orderSummary")}
        </h2>
        {items.map((item) => (
          <div
            key={item.id}
            className="flex justify-between gap-3 text-sm font-ui"
          >
            <div className="min-w-0">
              <span className="text-gray-700 block truncate">
                {item.product ? productTitle(lang, item.product) : "—"} × {item.quantity}
              </span>
              {item.product && <BasePriceHint product={item.product} />}
            </div>
            <span className="shrink-0 tabular-nums">
              {formatPrice((item.product?.price ?? 0) * item.quantity, lang === "de" ? "de-DE" : "ar-DE")}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-4 mb-6">
        <DiscountCodeField
          subtotal={total}
          applied={discount}
          onApply={setDiscount}
          onClear={() => setDiscount(null)}
        />
        <OrderCostBreakdown subtotal={total} discount={discount} weightGrams={weightGrams} />
      </div>

      <p className="text-xs text-gray-400 mb-4 text-center font-ui">
        {t("checkoutSecure")}
      </p>

      {error && (
        <p className="text-red-500 text-sm text-center mb-4 font-ui" role="alert">
          {error}
        </p>
      )}

      <Button
        fullWidth
        size="lg"
        onClick={() => void handleCheckout()}
        disabled={processing}
      >
        {processing ? t("paying") : t("payNow", { total: formatPrice(grandTotal, lang === "de" ? "de-DE" : "ar-DE") })}
      </Button>

      <Link
        href="/cart"
        className="block text-center text-sm text-gold mt-4 font-ui hover:underline"
      >
        {t("backToCart")}
      </Link>
    </div>
  );
}
