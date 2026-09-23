"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/catalog";
import { maxBuyQuantity } from "@/lib/pricing";
import { BasePriceHint } from "@/components/ProductPrice";
import FreeShippingBar from "@/components/cart/FreeShippingBar";
import DiscountCodeField, {
  type AppliedDiscount,
} from "@/components/cart/DiscountCodeField";
import OrderCostBreakdown, {
  computeCheckoutTotals,
} from "@/components/cart/OrderCostBreakdown";
import { Button } from "@/components/ui";

const DISCOUNT_STORAGE_KEY = "jmle_cart_discount";

export default function CartPage() {
  const { items, total, loading, updateQuantity, removeItem } = useCart();
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

  // Rabatt neu berechnen wenn Subtotal sinkt
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
        <ShoppingBag size={48} className="text-gray-300 mb-4" aria-hidden />
        <h1 className="font-display text-2xl mb-2">سلة التسوق فارغة</h1>
        <p className="text-gray-500 text-sm mb-6 font-ui">اكتشف مجموعتنا الفاخرة</p>
        <Link href="/" className="btn-primary">
          تسوق الآن
        </Link>
      </div>
    );
  }

  const { total: grandTotal } = computeCheckoutTotals(total, discount);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 animate-fade-up">
      <h1 className="font-display text-3xl mb-6 tracking-wide">سلة التسوق</h1>

      <FreeShippingBar subtotal={total} />

      <div className="space-y-3 mb-8">
        {items.map((item) => (
          <article
            key={item.id}
            className="flex gap-4 bg-white p-4 rounded-2xl border border-amber-200/40 shadow-sm"
          >
            <div className="relative w-24 h-24 sm:h-28 flex-shrink-0 bg-jmle-warm rounded-xl overflow-hidden">
              {item.product && (
                <Image
                  src={item.product.image}
                  alt={item.product.name}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              )}
            </div>

            <div className="flex-1 flex flex-col justify-between min-w-0">
              <div>
                <h3 className="font-ui font-medium text-luxury-ink truncate">
                  {item.product?.name ?? "منتج"}
                </h3>
                <p className="text-gold font-ui text-sm mt-0.5">
                  {formatPrice(item.product?.price ?? 0)}
                </p>
                {item.product && (
                  <BasePriceHint product={item.product} className="mt-0.5 block" />
                )}
              </div>

              <div className="flex items-center justify-between mt-3 gap-2">
                <div className="flex items-center border border-amber-200/60 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    className="p-2.5 min-h-11 min-w-11 hover:bg-jmle-warm disabled:opacity-30"
                    aria-label="تقليل الكمية"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="px-3 text-sm font-ui tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    disabled={
                      item.quantity >=
                      maxBuyQuantity(
                        item.product?.stock ?? 0,
                        item.product?.maxOrderQuantity ?? null
                      )
                    }
                    className="p-2.5 min-h-11 min-w-11 hover:bg-jmle-warm disabled:opacity-30"
                    aria-label="زيادة الكمية"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-2.5 min-h-11 min-w-11"
                  aria-label="حذف"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="text-start flex items-end shrink-0">
              <p className="font-ui font-semibold text-sm">
                {formatPrice((item.product?.price ?? 0) * item.quantity)}
              </p>
            </div>
          </article>
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

      <Link href="/checkout" className="block">
        <Button fullWidth size="lg">
          إتمام الشراء · {formatPrice(grandTotal)}
        </Button>
      </Link>
    </div>
  );
}
