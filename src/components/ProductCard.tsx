"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Minus, Plus, Check } from "lucide-react";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/types";
import { ProductPrice, StockBadge } from "@/components/ProductPrice";
import WishlistButton from "@/components/WishlistButton";
import { useShopLocale } from "@/components/ShopLocale";
import { productTitle } from "@/lib/shop-i18n";
import { maxBuyQuantity } from "@/lib/pricing";
import { PRODUCT_BADGES, normalizeBadges } from "@/lib/product-badges";
import {
  Button,
  DiscountBadge,
  OriginBadge,
  SealBadge,
} from "@/components/ui";

function detectSeals(product: Product): Array<"halal" | "organic"> {
  const hay =
    `${product.name} ${product.nameDe ?? ""} ${product.description} ${product.ingredients ?? ""}`.toLowerCase();
  const out: Array<"halal" | "organic"> = [];
  if (/حلال|halal/.test(hay)) out.push("halal");
  if (/عضوي|organic|\bbio\b/.test(hay)) out.push("organic");
  return out;
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const { lang, t } = useShopLocale();
  const title = productTitle(lang, product);
  const out = product.stock <= 0;
  const seals = detectSeals(product);
  const max = maxBuyQuantity(product.stock, product.maxOrderQuantity);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const activeBadges = normalizeBadges(product.badges);
  const highlights = PRODUCT_BADGES.filter((b) => activeBadges.includes(b.key));
  const customNote = (product.customNote ?? "").trim();

  const changeQty = (delta: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQty((q) => Math.max(1, Math.min(max || 1, q + delta)));
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (out) return;
    await addItem(product.id, Math.max(1, Math.min(max || 1, qty)));
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <article
      className={`group relative card-boutique overflow-hidden transition-all duration-300 ease-boutique hover:-translate-y-1 hover:shadow-gold hover:border-amber-200/80 ${
        out ? "opacity-60" : ""
      }`}
    >
      <div className="absolute top-2 end-2 z-20">
        <WishlistButton productId={product.id} size="sm" />
      </div>
      <Link href={`/products/${product.id}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40">
        <div
          className="relative aspect-square overflow-hidden !bg-white flex items-center justify-center"
          style={{ backgroundColor: "#ffffff" }}
        >
          <Image
            src={product.image}
            alt={product.nameDe ? `${title} – ${product.name}` : title}
            fill
            className="object-contain p-3 transition-transform duration-500 ease-boutique group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          <div className="absolute inset-x-0 top-0 p-2 flex gap-1.5 justify-between items-start pointer-events-none">
            <div className="flex flex-wrap gap-1.5">
              <StockBadge stock={product.stock} />
              <DiscountBadge percent={product.discountPercent} />
            </div>
            <div className="flex flex-col items-end gap-1.5 pe-12">
              {highlights.map((b) => (
                <span
                  key={b.key}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-ui shadow-gold-sm border border-white/70 ${b.className}`}
                >
                  {b.labelAr}
                </span>
              ))}
              {customNote && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-ui shadow-gold-sm border border-white/70 bg-jmle-mahogany text-white max-w-[9rem] truncate">
                  {customNote}
                </span>
              )}
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-2 flex flex-wrap gap-1.5 justify-start">
            <OriginBadge country={product.originCountry} />
            {seals.map((s) => (
              <SealBadge key={s} type={s} />
            ))}
          </div>
        </div>
        <div className="p-3 text-center">
          <h3 className="font-ui text-sm font-medium text-luxury-ink mb-0.5 line-clamp-2 min-h-[2.5rem] leading-snug">
            {title}
            {product.weightValue != null && (
              <span className="text-[11px] text-gray-500 font-normal">
                {" "}
                · {product.weightValue} {product.weightUnit}
              </span>
            )}
          </h3>
          <ProductPrice product={product} />
        </div>
      </Link>
      <div className="px-3 pb-3">
        {out ? (
          <p className="w-full py-2.5 text-center text-xs sm:text-sm font-medium text-gray-600 bg-gray-100 rounded-xl min-h-11 flex items-center justify-center">
            {t("outOfStock")}
          </p>
        ) : (
          <div className="flex items-stretch gap-2">
            {/* Mengenauswahl direkt an der Karte */}
            <div className="flex items-center rounded-xl border border-amber-200/80 bg-white shrink-0">
              <button
                type="button"
                onClick={changeQty(-1)}
                disabled={qty <= 1}
                aria-label="تقليل الكمية"
                className="w-8 min-h-11 flex items-center justify-center text-luxury-charcoal hover:text-gold disabled:opacity-40"
              >
                <Minus size={14} />
              </button>
              <span
                aria-live="polite"
                className="w-6 text-center text-sm font-ui font-semibold tabular-nums"
              >
                {qty}
              </span>
              <button
                type="button"
                onClick={changeQty(1)}
                disabled={qty >= (max || 1)}
                aria-label="زيادة الكمية"
                className="w-8 min-h-11 flex items-center justify-center text-luxury-charcoal hover:text-gold disabled:opacity-40"
              >
                <Plus size={14} />
              </button>
            </div>
            <Button
              fullWidth
              size="sm"
              className={added ? "bg-emerald-600 hover:bg-emerald-600 text-white" : ""}
              leadingIcon={
                added ? <Check size={16} aria-hidden /> : <ShoppingBag size={16} aria-hidden />
              }
              onClick={handleAddToCart}
              aria-label={`أضف ${product.name} للسلة`}
            >
              {added ? t("added") : t("addToCart")}
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}

interface ProductGridProps {
  products: Product[];
  title?: string;
}

export function ProductGrid({ products, title }: ProductGridProps) {
  if (products.length === 0) return null;

  return (
    <section className="py-10 md:py-14 px-4 md:px-8">
      {title && (
        <div className="text-center mb-8">
          <h2 className="section-title">{title}</h2>
          <div className="gold-divider" aria-hidden />
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 max-w-7xl mx-auto">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

export { ProductPrice };
