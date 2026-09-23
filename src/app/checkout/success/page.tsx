"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui";

export default function CheckoutSuccessPage() {
  const { refreshCart } = useCart();

  useEffect(() => {
    sessionStorage.removeItem("jmle_cart_discount");
    void refreshCart();
  }, [refreshCart]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center animate-fade-up">
      <CheckCircle size={64} className="text-emerald-600 mb-6" aria-hidden />
      <h1 className="font-display text-3xl mb-3 tracking-wide">
        شكراً لطلبك!
      </h1>
      <p className="text-gray-500 mb-8 max-w-md font-ui text-sm leading-relaxed">
        تم استلام طلبك بنجاح. ستتلقى تأكيداً عبر البريد الإلكتروني.
        يمكنك متابعة طلبك وتنزيل الفاتورة من حسابك.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <Link href="/profile" className="flex-1">
          <Button fullWidth variant="outline">
            طلباتي
          </Button>
        </Link>
        <Link href="/" className="flex-1">
          <Button fullWidth>العودة للرئيسية</Button>
        </Link>
      </div>
    </div>
  );
}
