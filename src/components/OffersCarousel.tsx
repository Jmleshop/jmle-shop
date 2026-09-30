"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/catalog";
import { DiscountBadge } from "@/components/ui";
import WishlistButton from "@/components/WishlistButton";
import { useShopLocale } from "@/components/ShopLocale";
import { productTitle, type ShopMsgKey } from "@/lib/shop-i18n";
import { originalImageSrc, SHOP_IMAGE_QUALITY } from "@/lib/sharp-image";
import type { Product } from "@/types";

interface OffersCarouselProps {
  products: Product[];
  title?: string;
  titleKey?: Extract<
    ShopMsgKey,
    "homeOffers" | "homeLatest" | "homeFeatured" | "homeBestsellers"
  >;
  /** Laufrichtung umkehren (für die zweite Reihe) */
  reverse?: boolean;
}

function OfferCard({ product }: { product: Product }) {
  const { lang } = useShopLocale();
  const title = productTitle(lang, product);
  return (
    <div className="group relative w-44 sm:w-52 md:w-60 shrink-0 px-2">
      <div className="absolute top-3 end-3 z-30">
        <WishlistButton productId={product.id} size="sm" />
      </div>
      <Link href={`/products/${product.id}`} className="block" aria-label={title}>
        <div className="card-boutique overflow-hidden transition-all duration-300 ease-boutique group-hover:shadow-gold group-hover:-translate-y-1">
          <div className="product-image-frame">
            <Image
              src={originalImageSrc(product.image)}
              alt={title}
              fill
              quality={SHOP_IMAGE_QUALITY}
              className="product-image-media transition-transform duration-500 ease-boutique"
              sizes="(max-width: 640px) 70vw, (max-width: 1024px) 31vw, 240px"
            />
            <div className="absolute top-2 start-2">
              <DiscountBadge percent={product.discountPercent} />
            </div>
          </div>
          <div className="p-3 text-center">
            <h3 className="font-ui text-sm font-medium text-luxury-ink line-clamp-1">
              {title}
            </h3>
            <div className="mt-1 flex items-center justify-center gap-2">
              <span className="font-ui font-bold text-gold-dark">
                {formatPrice(product.price, lang === "de" ? "de-DE" : "ar-DE")}
              </span>
              {product.originalPrice != null &&
                product.originalPrice > product.price && (
                  <span className="text-xs text-gray-400 line-through">
                    {formatPrice(product.originalPrice, lang === "de" ? "de-DE" : "ar-DE")}
                  </span>
                )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

export default function OffersCarousel({
  products,
  title,
  titleKey,
  reverse = false,
}: OffersCarouselProps) {
  const { t } = useShopLocale();
  if (!products.length) return null;

  // Leerer Titel = Überschrift ausblenden (kein i18n-Fallback auf der Startseite)
  const heading = (title ?? "").trim() || (titleKey ? t(titleKey) : "");
  const loop = [...products, ...products];
  const duration = Math.max(20, products.length * 6);

  return (
    <section className="py-8 md:py-10 bg-gradient-to-b from-jmle-warm/60 to-transparent">
      {heading ? (
        <div className="text-center mb-6 px-4">
          <h2 className="section-title">{heading}</h2>
          <div className="gold-divider" aria-hidden />
        </div>
      ) : null}

      <div
        dir="ltr"
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
