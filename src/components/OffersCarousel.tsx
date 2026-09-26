"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/catalog";
import { DiscountBadge } from "@/components/ui";
import type { Product } from "@/types";

interface OffersCarouselProps {
  products: Product[];
  title?: string;
  /** Laufrichtung umkehren (für die zweite Reihe) */
  reverse?: boolean;
}

function OfferCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="group block w-44 sm:w-52 md:w-60 shrink-0 px-2"
      aria-label={product.name}
    >
      <div className="card-boutique overflow-hidden transition-all duration-300 ease-boutique group-hover:shadow-gold group-hover:-translate-y-1">
        <div
          className="relative aspect-square overflow-hidden !bg-white flex items-center justify-center"
          style={{ backgroundColor: "#ffffff" }}
        >
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-contain p-3 transition-transform duration-500 ease-boutique group-hover:scale-105"
            sizes="(max-width: 640px) 70vw, (max-width: 1024px) 31vw, 23vw"
          />
          <div className="absolute top-2 start-2">
            <DiscountBadge percent={product.discountPercent} />
          </div>
        </div>
        <div className="p-3 text-center">
          <h3 className="font-ui text-sm font-medium text-luxury-ink line-clamp-1">
            {product.name}
          </h3>
          <div className="mt-1 flex items-center justify-center gap-2">
            <span className="font-ui font-bold text-gold-dark">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice != null &&
              product.originalPrice > product.price && (
                <span className="text-xs text-gray-400 line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function OffersCarousel({
  products,
  title,
  reverse = false,
}: OffersCarouselProps) {
  if (!products.length) return null;

  // Für einen nahtlosen Loop die Liste duplizieren.
  const loop = [...products, ...products];
  // Dauer an Produktanzahl koppeln (ruhiges Tempo).
  const duration = Math.max(20, products.length * 6);

  return (
    <section className="py-8 md:py-10 bg-gradient-to-b from-jmle-warm/60 to-transparent">
      <div className="text-center mb-6 px-4">
        <h2 className="section-title">{title ?? "عروض خاصة"}</h2>
        <div className="gold-divider" aria-hidden />
      </div>

      <div
        className={`jmle-marquee relative w-full overflow-hidden ${
          reverse ? "jmle-marquee-reverse" : ""
        }`}
      >
        <div
          className="jmle-marquee-track"
          style={{ ["--marquee-duration" as string]: `${duration}s` }}
        >
          {loop.map((p, i) => (
            <OfferCard key={`${p.id}-${i}`} product={p} />
          ))}
        </div>
        {/* sanfte Ränder */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 start-0 w-10 bg-gradient-to-r from-jmle-cream to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 end-0 w-10 bg-gradient-to-l from-jmle-cream to-transparent"
        />
      </div>
    </section>
  );
}
