"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/catalog";

export default function CartPage() {
  const { items, total, loading, updateQuantity, removeItem } = useCart();

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
        <ShoppingBag size={48} className="text-gray-300 mb-4" />
        <h1 className="text-2xl font-light mb-2">سلة التسوق فارغة</h1>
        <p className="text-gray-500 text-sm mb-6">اكتشف مجموعتنا الفاخرة</p>
        <Link href="/" className="btn-primary">
          تسوق الآن
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      <h1 className="text-3xl font-light mb-8 tracking-wide">سلة التسوق</h1>

      <div className="space-y-4 mb-8">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex gap-4 bg-white p-4 shadow-sm"
          >
            <div className="relative w-24 h-32 flex-shrink-0 bg-luxury-cream">
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

            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-light text-lg">
                  {item.product?.name ?? "منتج"}
                </h3>
                <p className="text-gold font-medium mt-1">
                  {formatPrice(item.product?.price ?? 0)}
                </p>
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center border border-gray-200">
                  <button
                    onClick={() =>
                      updateQuantity(item.id, item.quantity - 1)
                    }
                    disabled={item.quantity <= 1}
                    className="p-2 hover:bg-gray-50 disabled:opacity-30"
                    aria-label="تقليل الكمية"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="px-4 text-sm">{item.quantity}</span>
                  <button
                    onClick={() =>
                      updateQuantity(item.id, item.quantity + 1)
                    }
                    className="p-2 hover:bg-gray-50"
                    aria-label="زيادة الكمية"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <button
                  onClick={() => removeItem(item.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-2"
                  aria-label="حذف"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="text-left flex items-end">
              <p className="font-medium">
                {formatPrice((item.product?.price ?? 0) * item.quantity)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 pt-6">
        <div className="flex justify-between items-center mb-6">
          <span className="text-lg font-light">المجموع</span>
          <span className="text-2xl font-medium text-gold">
            {formatPrice(total)}
          </span>
        </div>
        <Link href="/checkout" className="btn-primary w-full block text-center">
          إتمام الشراء
        </Link>
      </div>
    </div>
  );
}
