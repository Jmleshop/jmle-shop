"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ShoppingBag, Minus, Plus, Check } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useCartFly } from "@/context/CartFlyContext";
import type { Product } from "@/types";
import { ProductPrice, StockBadge } from "@/components/ProductPrice";
import WishlistButton from "@/components/WishlistButton";
import ProductPagination from "@/components/ProductPagination";
import ShopImage from "@/components/ShopImage";
import { useShopLocale } from "@/components/ShopLocale";
import { useAutoTranslate } from "@/hooks/useAutoTranslate";
import { originalImageSrc } from "@/lib/sharp-image";
import { maxBuyQuantity } from "@/lib/pricing";
import { PRODUCT_BADGES, normalizeBadges } from "@/lib/product-badges";
import {
  Button,
  DiscountBadge,
  OriginBadge,
  SealBadge,
} from "@/components/ui";

/** Max. Produkte pro Seite (Kategorie / Alle / Suche). */
export const PRODUCTS_PAGE_SIZE = 30;

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
  const { flyToCart } = useCartFly();
  const { lang, t } = useShopLocale();
  const title = useAutoTranslate(
    lang,
    lang === "de" ? product.nameDe : product.name,
    lang === "de" ? product.name : product.nameDe
  );
  const imgRef = useRef<HTMLDivElement>(null);
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
    const rect = imgRef.current?.getBoundingClientRect();
    if (rect) {
      flyToCart({ image: originalImageSrc(product.image), fromRect: rect });
    }
    await addItem(product.id, Math.max(1, Math.min(max || 1, qty)));
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border border-orange-100/80 bg-white transition-all duration-300 ease-boutique hover:-translate-y-0.5 hover:shadow-gold hover:border-orange-200/80 sm:hover:-translate-y-1 ${
        out ? "opacity-60" : ""
      }`}
    >
      <div className="absolute top-1 end-1 z-30 sm:top-2 sm:end-2">
        <WishlistButton productId={product.id} size="sm" />
      </div>
      <Link href={`/products/${product.id}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40">
        <ShopImage
          ref={imgRef}
          role="product"
          src={product.image}
          alt={product.nameDe ? `${title} – ${product.name}` : title}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 320px"
        >
          <div className="absolute inset-x-0 top-0 z-10 p-1 sm:p-2 flex gap-1 justify-between items-start pointer-events-none">
            <div className="flex flex-wrap gap-1">
              <StockBadge stock={product.stock} />
              <DiscountBadge percent={product.discountPercent} />
            </div>
            <div className="hidden sm:flex flex-col items-end gap-1.5 pe-12">
              {highlights.map((b) => (
                <span
                  key={b.key}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-ui shadow-gold-sm border border-white/70 ${b.className}`}
                >
                  {lang === "de" ? b.labelDe : b.labelAr}
                </span>
              ))}
              {customNote && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-ui shadow-gold-sm border border-white/70 bg-jmle-mahogany text-white max-w-[9rem] truncate">
                  {customNote}
                </span>
              )}
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 z-10 hidden p-2 flex-wrap gap-1.5 justify-start sm:flex">
            <OriginBadge country={product.originCountry} />
            {seals.map((s) => (
              <SealBadge key={s} type={s} />
            ))}
          </div>
        </ShopImage>
        <div className="bg-white/95 p-1.5 sm:p-3 text-center">
          <h3 className="font-ui text-[11px] sm:text-sm font-medium text-luxury-ink mb-0.5 line-clamp-2 min-h-[2.2em] sm:min-h-[2.5rem] leading-snug">
            {title}
            {product.weightValue != null && (
              <span className="hidden sm:inline text-[11px] text-gray-500 font-normal">
                {" "}
                · {product.weightValue} {product.weightUnit}
              </span>
            )}
          </h3>
          <ProductPrice product={product} />
        </div>
      </Link>
      <div className="bg-white/95 px-1.5 pb-1.5 sm:px-3 sm:pb-3">
        {out ? (
          <p className="w-full py-1.5 sm:py-2.5 text-center text-[10px] sm:text-sm font-medium text-gray-600 bg-gray-100 rounded-lg sm:rounded-xl min-h-9 sm:min-h-11 flex items-center justify-center">
            {t("outOfStock")}
          </p>
        ) : (
          <div className="flex items-stretch gap-1 sm:gap-2">
            <div className="flex items-center rounded-lg sm:rounded-xl border border-amber-200/80 bg-white shrink-0">
              <button
                type="button"
                onClick={changeQty(-1)}
                disabled={qty <= 1}
                aria-label={t("qtyDecrease")}
                className="w-8 min-h-11 flex items-center justify-center text-luxury-charcoal hover:text-gold disabled:opacity-40"
              >
                <Minus size={14} aria-hidden />
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
                aria-label={t("qtyIncrease")}
                className="w-8 min-h-11 flex items-center justify-center text-luxury-charcoal hover:text-gold disabled:opacity-40"
              >
                <Plus size={14} aria-hidden />
              </button>
            </div>
            <Button
              fullWidth
              size="sm"
              className={`min-h-11 px-2 sm:px-3 ${
                added ? "bg-emerald-600 hover:bg-emerald-600 text-white" : ""
              }`}
              leadingIcon={
                added ? <Check size={16} aria-hidden /> : <ShoppingBag size={16} aria-hidden />
              }
              onClick={handleAddToCart}
              aria-label={`${t("addToCart")} ${title}`}
            >
              <span className="text-[11px] sm:text-sm">
                {added ? t("added") : t("addToCart")}
              </span>
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
  titleKey?: "homeFeatured" | "allProducts";
  /** Produkte pro Seite (Standard 30). */
  pageSize?: number;
}

export function ProductGrid({
  products,
  title,
  titleKey,
  pageSize = PRODUCTS_PAGE_SIZE,
}: ProductGridProps) {
  const { t } = useShopLocale();
  const sectionRef = useRef<HTMLElement>(null);
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(products.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [products]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return products.slice(start, start + pageSize);
  }, [products, page, pageSize]);

  const goPage = (next: number) => {
    const clamped = Math.max(1, Math.min(pageCount, next));
    setPage(clamped);
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (products.length === 0) return null;
  const heading = titleKey ? t(titleKey) : title;

  return (
    <section ref={sectionRef} className="py-8 md:py-14 px-2 sm:px-4 md:px-8">
      {heading && (
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="section-title">{heading}</h2>
          <div className="gold-divider" aria-hidden />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 max-w-7xl mx-auto">
        {pageItems.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      <ProductPagination page={page} pageCount={pageCount} onChange={goPage} />
    </section>
  );
}

export { ProductPrice };
