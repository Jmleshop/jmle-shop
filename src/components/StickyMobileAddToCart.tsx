"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { ShoppingBag, Check } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useCartFly } from "@/context/CartFlyContext";
import { formatEuroDe, discountedPrice, maxBuyQuantity } from "@/lib/pricing";
import { useShopLocale } from "@/components/ShopLocale";
import { productTitle } from "@/lib/shop-i18n";
import type { Product } from "@/types";

/**
 * Mobile Sticky-ATC: erscheint über der FooterNav, sobald die
 * Haupt-ATC-Zone aus dem Viewport gescrollt wurde.
 */
export default function StickyMobileAddToCart({
  product,
  observeRef,
}: {
  product: Product;
  /** Element, dessen Sichtbarkeit die Leiste steuert (Haupt-ATC) */
  observeRef: RefObject<HTMLElement | null>;
}) {
  const { addItem } = useCart();
  const { flyToCart } = useCartFly();
  const { lang, t } = useShopLocale();
  const [visible, setVisible] = useState(false);
  const [added, setAdded] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const max = maxBuyQuantity(product.stock, product.maxOrderQuantity);
  const out = product.stock <= 0 || max < 1;
  const price = discountedPrice(product.price, product.discountPercent);
  const title = productTitle(lang, product);

  useEffect(() => {
    const el = observeRef.current;
    if (!el || out) {
      setVisible(false);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0.15, rootMargin: "0px 0px -48px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [observeRef, out, product.id]);

  if (out) return null;

  const handleAdd = async () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect && product.image) {
      flyToCart({ image: product.image, fromRect: rect });
    }
    await addItem(product.id, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div
      className={`fixed inset-x-0 z-[55] md:hidden transition-transform duration-300 ease-out ${
        visible ? "translate-y-0" : "translate-y-[120%]"
      }`}
      style={{ bottom: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}
      aria-hidden={!visible}
    >
      <div className="mx-auto max-w-lg px-3 pb-2">
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200/60 bg-jmle-cream/97 backdrop-blur-md shadow-[0_-4px_24px_rgba(180,83,9,0.14)] px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-ui font-medium text-luxury-ink">
              {title}
            </p>
            <p className="text-sm font-ui font-semibold text-gold tabular-nums">
              {formatEuroDe(price)}
              {product.discountPercent > 0 && (
                <span className="ms-1.5 text-xs font-normal text-gray-400 line-through">
                  {formatEuroDe(product.price)}
                </span>
              )}
            </p>
          </div>
          <button
            ref={btnRef}
            type="button"
            onClick={() => void handleAdd()}
            tabIndex={visible ? 0 : -1}
            className={`shrink-0 inline-flex items-center justify-center gap-1.5 min-h-11 px-4 rounded-xl text-sm font-ui font-medium text-white transition-colors ${
              added
                ? "bg-emerald-600"
                : "bg-gold hover:bg-gold-dark active:scale-[0.98]"
            }`}
            aria-label={t("addToCart")}
          >
            {added ? (
              <Check size={16} aria-hidden />
            ) : (
              <ShoppingBag size={16} aria-hidden />
            )}
            <span>{added ? t("added") : t("addToCart")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
