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
import SafeShopImage from "@/components/SafeShopImage";
import { useShopLocale } from "@/components/ShopLocale";
import { useAutoTranslate } from "@/hooks/useAutoTranslate";
import { vercelOptimizedImageSrc } from "@/lib/sharp-image";
import { maxBuyQuantity } from "@/lib/pricing";
import { PRODUCT_BADGES, normalizeBadges } from "@/lib/product-badges";
import {
  DiscountBadge,
  OriginBadge,
  SealBadge,
} from "@/components/ui";

/** Max. Produkte pro Seite (Kategorie / Alle / Suche). */
export const PRODUCTS_PAGE_SIZE = 24;

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
  const { lang } = useShopLocale();
  const title = useAutoTranslate(
    lang,
    lang === "de" ? product.nameDe : product.name,
    lang === "de" ? product.name : product.nameDe
  );
  const imgRef = useRef<HTMLDivElement>(null);
  const out = product.stock <= 0;
  const seals = detectSeals(product);

  const activeBadges = normalizeBadges(product.badges);
  const highlights = PRODUCT_BADGES.filter((b) => activeBadges.includes(b.key));
  const customNote = (product.customNote ?? "").trim();

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border border-orange-100/80 bg-white transition-all duration-300 ease-boutique hover:-translate-y-0.5 hover:shadow-gold hover:border-orange-200/80 sm:hover:-translate-y-1 ${
        out ? "opacity-60" : ""
      }`}
    >
      <div className="absolute top-1 end-1 z-30 sm:top-2 sm:end-2">
        <WishlistButton productId={product.id} size="sm" />
      </div>
      <div className="relative">
        <Link
          href={`/products/${product.id}`}
          tabIndex={-1}
          aria-hidden
          className="block"
        >
          <div ref={imgRef} className="product-image-frame">
            <SafeShopImage
              src={product.image}
              alt=""
              fill
              className="product-image-media"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 320px"
            />
            <div className="absolute inset-x-0 top-0 p-1 sm:p-2 flex gap-1 justify-between items-start pointer-events-none">
              <div className="flex flex-wrap gap-1">
                <StockBadge stock={product.stock} />
                <DiscountBadge percent={product.discountPercent} />
              </div>
              <div className="hidden sm:flex flex-col items-end gap-1.5 pe-12">
                {highlights.map((b) => (
                  <span
                    key={b.key}
                    className={`px-2 py-0.5 rounded-full text-xs font-bold font-ui shadow-gold-sm border border-white/70 ${b.className}`}
                  >
                    {lang === "de" ? b.labelDe : b.labelAr}
                  </span>
                ))}
                {customNote && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold font-ui shadow-gold-sm border border-white/70 bg-jmle-mahogany text-white max-w-[9rem] truncate">
                    {customNote}
                  </span>
                )}
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 hidden p-2 flex-wrap gap-1.5 justify-start sm:flex">
              <OriginBadge country={product.originCountry} />
              {seals.map((s) => (
                <SealBadge key={s} type={s} />
              ))}
            </div>
          </div>
        </Link>
        {!out && <QuickAdd product={product} title={title} imgRef={imgRef} />}
      </div>
      <Link
        href={`/products/${product.id}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-orange/40"
      >
        <div className="bg-white/95 p-1.5 sm:p-3 text-center">
          <h3 className="font-ui text-xs sm:text-sm font-medium text-luxury-ink mb-0.5 line-clamp-2 min-h-[2.2em] sm:min-h-[2.5rem] leading-snug">
            {title}
            {product.weightValue != null && (
              <span className="hidden sm:inline text-xs text-gray-500 font-normal">
                {" "}
                · {product.weightValue} {product.weightUnit}
              </span>
            )}
          </h3>
          <ProductPrice product={product} />
        </div>
      </Link>
    </article>
  );
}

/**
 * Kompakter Warenkorb-Button auf dem Produktbild. Erst ein Klick öffnet
 * die Mengenauswahl; bei Höchstmenge 1 wird direkt hinzugefügt.
 */
function QuickAdd({
  product,
  title,
  imgRef,
}: {
  product: Product;
  title: string;
  imgRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { addItem } = useCart();
  const { flyToCart } = useCartFly();
  const { t } = useShopLocale();
  const max = Math.max(1, maxBuyQuantity(product.stock, product.maxOrderQuantity));
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const add = async (amount: number) => {
    const rect = imgRef.current?.getBoundingClientRect();
    if (rect) {
      flyToCart({ image: vercelOptimizedImageSrc(product.image, 96), fromRect: rect });
    }
    await addItem(product.id, Math.max(1, Math.min(max, amount)));
    setOpen(false);
    setQty(1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const stepBtn =
    "flex h-10 w-10 items-center justify-center rounded-full text-luxury-charcoal hover:bg-jmle-warm hover:text-brand-orange disabled:opacity-40";

  if (open) {
    return (
      <div
        ref={panelRef}
        role="group"
        aria-label={`${t("qtyLabel")} — ${title}`}
        className="absolute inset-x-1.5 bottom-1.5 z-20 flex items-center gap-1 rounded-full bg-white/95 p-1 shadow-boutique ring-1 ring-orange-100 backdrop-blur animate-fade-up sm:inset-x-2 sm:bottom-2"
      >
        <button
          type="button"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          disabled={qty <= 1}
          aria-label={t("qtyDecrease")}
          className={stepBtn}
        >
          <Minus size={16} aria-hidden />
        </button>
        <span aria-live="polite" className="min-w-6 flex-1 text-center text-base font-ui font-semibold tabular-nums">
          {qty}
        </span>
        <button
          type="button"
          onClick={() => setQty((q) => Math.min(max, q + 1))}
          disabled={qty >= max}
          aria-label={t("qtyIncrease")}
          className={stepBtn}
        >
          <Plus size={16} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => void add(qty)}
          aria-label={`${t("addToCart")} ${title}`}
          autoFocus
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-orange text-white shadow-gold-sm hover:bg-brand-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50 focus-visible:ring-offset-1"
        >
          <Check size={18} aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => (max <= 1 ? void add(1) : setOpen(true))}
      aria-label={added ? t("added") : `${t("addToCart")} ${title}`}
      aria-haspopup={max > 1 ? "dialog" : undefined}
      className={`absolute bottom-1.5 end-1.5 z-20 flex h-11 w-11 items-center justify-center rounded-full text-white shadow-gold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50 focus-visible:ring-offset-2 sm:bottom-2 sm:end-2 ${
        added ? "bg-emerald-600" : "bg-brand-orange hover:bg-brand-red"
      }`}
    >
      {added ? <Check size={20} aria-hidden /> : <ShoppingBag size={20} aria-hidden />}
    </button>
  );
}

interface ProductGridProps {
  products: Product[];
  title?: string;
  titleKey?: "homeFeatured" | "allProducts";
  /** Produkte pro Seite (Standard 24). */
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
