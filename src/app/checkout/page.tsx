"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
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

const DISCOUNT_STORAGE_KEY = "jmle_cart_discount";

export default function CheckoutPage() {
  const { items, total, loading } = useCart();
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
        }),
      });

      const data = await response.json();

      if (data.url) {
        toast.success("جاري التحويل إلى الدفع الآمن…");
        window.location.href = data.url;
      } else {
        const msg = data.error || "حدث خطأ أثناء الدفع";
        setError(msg);
        toast.error(msg);
        setProcessing(false);
      }
    } catch {
      setError("تعذر الاتصال بخدمة الدفع");
      toast.error("تعذر الاتصال بخدمة الدفع");
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-gray-400 font-ui">جاري التحميل...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center px-4">
        <h1 className="font-display text-2xl mb-4">لا توجد منتجات للدفع</h1>
        <Link href="/" className="btn-primary">
          العودة للتسوق
        </Link>
      </div>
    );
  }

  const { total: grandTotal } = computeCheckoutTotals(total, discount);

  return (
    <div className="max-w-lg mx-auto px-4 py-8 md:py-12 animate-fade-up">
      <h1 className="font-display text-3xl mb-6 tracking-wide">إتمام الشراء</h1>

      <FreeShippingBar subtotal={total} />

      <div className="bg-white rounded-2xl border border-amber-200/50 p-5 shadow-sm mb-4 space-y-3">
        <h2 className="text-sm font-ui font-medium text-gold mb-1">
          ملخص الطلب
        </h2>
        {items.map((item) => (
          <div
            key={item.id}
            className="flex justify-between gap-3 text-sm font-ui"
          >
            <div className="min-w-0">
              <span className="text-gray-700 block truncate">
                {item.product?.name} × {item.quantity}
              </span>
              {item.product && <BasePriceHint product={item.product} />}
            </div>
            <span className="shrink-0 tabular-nums">
              {formatPrice((item.product?.price ?? 0) * item.quantity)}
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
        <OrderCostBreakdown subtotal={total} discount={discount} />
      </div>

      <p className="text-xs text-gray-400 mb-4 text-center font-ui">
        الدفع الآمن عبر Stripe · Preise inkl. MwSt.
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
        {processing
          ? "جاري التحويل..."
          : `ادفع الآن · ${formatPrice(grandTotal)}`}
      </Button>

      <Link
        href="/cart"
        className="block text-center text-sm text-gold mt-4 font-ui hover:underline"
      >
        العودة إلى السلة
      </Link>
    </div>
  );
}
