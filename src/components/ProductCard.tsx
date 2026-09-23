"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/types";
import { ProductPrice, StockBadge } from "@/components/ProductPrice";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const out = product.stock <= 0;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (out) return;
    await addItem(product.id);
  };

  return (
    <article
      className={`group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 ${
        out ? "opacity-60" : ""
      }`}
    >
      <Link href={`/products/${product.id}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-jmle-warm">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
          <div className="absolute top-2 right-2">
            <StockBadge stock={product.stock} />
          </div>
        </div>
        <div className="p-3 text-center">
          <h3 className="text-sm font-medium text-luxury-black mb-0.5 line-clamp-2 min-h-[2.5rem]">
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
          <p className="w-full py-2.5 text-center text-xs sm:text-sm font-medium text-gray-600 bg-gray-100 rounded-xl">
            Ausverkauft
          </p>
        ) : (
          <button
            onClick={handleAddToCart}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-medium bg-gold text-white rounded-xl hover:bg-jmle-yellow hover:text-luxury-black transition-colors duration-300"
          >
            <ShoppingBag size={16} />
            أضف للسلة
          </button>
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
    <section className="py-10 px-4 md:px-8">
      {title && (
        <h2 className="text-xl md:text-2xl font-semibold text-center mb-8 text-luxury-black">
          {title}
        </h2>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5 max-w-6xl mx-auto">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

export { ProductPrice };
