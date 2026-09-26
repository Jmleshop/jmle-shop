"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui";
import { useShopLocale } from "@/components/ShopLocale";

export default function CheckoutSuccessPage() {
  const { refreshCart } = useCart();
  const { t } = useShopLocale();

  useEffect(() => {
    sessionStorage.removeItem("jmle_cart_discount");
    void refreshCart();
  }, [refreshCart]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center animate-fade-up">
      <CheckCircle size={64} className="text-emerald-600 mb-6" aria-hidden />
      <h1 className="font-display text-3xl mb-3 tracking-wide">
        {t("thanksTitle")}
      </h1>
      <p className="text-gray-500 mb-8 max-w-md font-ui text-sm leading-relaxed">
        {t("thanksBody")}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <Link href="/profile" className="flex-1">
          <Button fullWidth variant="outline">
            {t("myOrders")}
          </Button>
        </Link>
        <Link href="/" className="flex-1">
          <Button fullWidth>{t("backHome")}</Button>
        </Link>
      </div>
    </div>
  );
}
