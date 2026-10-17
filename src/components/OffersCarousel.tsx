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
    <div className="group relative w-[10.5rem] sm:w-52 md:w-56 shrink-0 px-1.5 sm:px-2">
      <div className="absolute top-2.5 end-2.5 z-30">
        <WishlistButton productId={product.id} size="sm" />
      </div>
      <Link
        href={`/products/${product.id}`}
        className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40 focus-visible:ring-offset-2 focus-visible:ring-offset-jmle-cream"
        aria-label={title}
      >
        <div className="overflow-hidden rounded-2xl border border-orange-100/90 bg-white shadow-sm transition-[box-shadow,transform,border-color] duration-300 ease-boutique group-hover:-translate-y-0.5 group-hover:border-orange-200/90 group-hover:shadow-boutique motion-reduce:group-hover:translate-y-0">
          <div className="product-image-frame">
            <Image
              src={originalImageSrc(product.image)}
              alt={title}
              fill
              quality={SHOP_IMAGE_QUALITY}
              className="product-image-media"
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 28vw, 224px"
            />
            <div className="absolute top-2 start-2">
              <DiscountBadge percent={product.discountPercent} />
            </div>
          </div>
          <div className="flex min-h-[4.75rem] flex-col justify-between gap-1.5 bg-white px-2.5 py-2.5 sm:min-h-[5.25rem] sm:px-3 sm:py-3 text-center">
            <h3 className="font-ui text-[12px] sm:text-sm font-medium text-luxury-ink line-clamp-2 min-h-[2.4em] leading-snug">
              {title}
            </h3>
            <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-0.5">
              <span className="font-ui text-sm sm:text-base font-semibold tabular-nums text-gold-dark">
                {formatPrice(product.price, lang === "de" ? "de-DE" : "ar-DE")}
              </span>
              {product.originalPrice != null &&
                product.originalPrice > product.price && (
                  <span className="text-[11px] sm:text-xs text-gray-400 line-through tabular-nums">
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

/** Cap marquee DOM; full catalog still available on product/category pages. */
const MARQUEE_MAX_ITEMS = 16;

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
  // Never mount the entire catalog twice — keep a small, seamless track.
  const visible = products.slice(0, MARQUEE_MAX_ITEMS);
  const loop =
    visible.length > 1 ? [...visible, ...visible] : visible;
  const duration = Math.max(20, visible.length * 6);

  return (
    <section className="home-content-section home-products-band py-8 md:py-11">
      {heading ? (
        <div className="layout-section-title-wrap home-section-title text-center mb-5 md:mb-7 px-4 sm:px-6">
          <h2 className="section-title tracking-tight">{heading}</h2>
          <div className="gold-divider mt-2.5 mb-0" aria-hidden />
        </div>
      ) : null}

      <div
        dir="ltr"
        className={`jmle-marquee relative w-full overflow-hidden ${
          reverse ? "jmle-marquee-reverse" : ""
        }`}
      >
        <div
          className="jmle-marquee-track py-1"
          style={{ ["--marquee-duration" as string]: `${duration}s` }}
        >
          {loop.map((p, i) => (
            <OfferCard key={`${p.id}-${i}`} product={p} />
          ))}
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 start-0 w-8 sm:w-12 bg-gradient-to-r from-jmle-cream via-jmle-cream/80 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 end-0 w-8 sm:w-12 bg-gradient-to-l from-jmle-cream via-jmle-cream/80 to-transparent"
        />
      </div>
    </section>
  );
}
