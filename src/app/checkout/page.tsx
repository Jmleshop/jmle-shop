"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/catalog";

export default function CheckoutPage() {
  const { items, total, loading } = useCart();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

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
            name: item.product?.name,
            price: item.product?.price,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "حدث خطأ أثناء الدفع");
        setProcessing(false);
      }
    } catch {
      setError("تعذر الاتصال بخدمة الدفع");
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-gray-400">جاري التحميل...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-light mb-4">لا توجد منتجات للدفع</h1>
        <Link href="/" className="btn-primary">
          العودة للتسوق
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 md:py-12">
      <h1 className="text-3xl font-light mb-8 tracking-wide">إتمام الشراء</h1>

      <div className="bg-white p-6 shadow-sm mb-6 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span>
              {item.product?.name} × {item.quantity}
            </span>
            <span>{formatPrice((item.product?.price ?? 0) * item.quantity)}</span>
          </div>
        ))}
        <div className="border-t pt-3 flex justify-between font-medium">
          <span>المجموع</span>
          <span className="text-gold">{formatPrice(total)}</span>
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-4 text-center">
        الدفع الآمن عبر Stripe
      </p>

      {error && (
        <p className="text-red-500 text-sm text-center mb-4">{error}</p>
      )}

      <button
        onClick={handleCheckout}
        disabled={processing}
        className="btn-primary w-full disabled:opacity-50"
      >
        {processing ? "جاري التحويل..." : "ادفع الآن"}
      </button>
    </div>
  );
}
