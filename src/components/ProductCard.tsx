"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/types";
import { ProductPrice, StockBadge } from "@/components/ProductPrice";
import WishlistButton from "@/components/WishlistButton";
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
  const out = product.stock <= 0;
  const seals = detectSeals(product);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (out) return;
    await addItem(product.id);
  };

  return (
    <article
      className={`group card-boutique overflow-hidden transition-all duration-300 ease-boutique hover:-translate-y-1 hover:shadow-gold hover:border-amber-200/80 ${
        out ? "opacity-60" : ""
      }`}
    >
      <Link href={`/products/${product.id}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40">
        <div className="relative aspect-square overflow-hidden bg-jmle-warm">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 ease-boutique group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          <div className="absolute inset-x-0 top-0 p-2 flex flex-wrap gap-1.5 justify-between items-start">
            <div className="flex flex-wrap gap-1.5">
              <StockBadge stock={product.stock} />
              <DiscountBadge percent={product.discountPercent} />
            </div>
            <WishlistButton productId={product.id} size="sm" />
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
            {product.name}
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
            نفذ من المخزون
          </p>
        ) : (
          <Button
            fullWidth
            size="sm"
            leadingIcon={<ShoppingBag size={16} aria-hidden />}
            onClick={handleAddToCart}
            aria-label={`أضف ${product.name} للسلة`}
          >
            أضف للسلة
          </Button>
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
