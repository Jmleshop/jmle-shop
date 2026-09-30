"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Slide } from "@/types";
import { cn } from "@/lib/cn";
import { SHOP_IMAGE_QUALITY } from "@/lib/sharp-image";
import { useShopLocale } from "@/components/ShopLocale";
import { slideTitle } from "@/lib/shop-i18n";
import { useAutoTranslate } from "@/hooks/useAutoTranslate";

interface CompactBannerSliderProps {
  slides: Slide[];
  className?: string;
}

function slideHref(slide: Slide): string | null {
  if (slide.linkCategoryId) return `/categories/${slide.linkCategoryId}`;
  if (slide.linkUrl) return slide.linkUrl;
  return null;
}

function BannerSlideContent({ slide, priority }: { slide: Slide; priority?: boolean }) {
  const { lang, t } = useShopLocale();
  const titlePreferred = lang === "de" ? slide.titleDe : slide.titleAr || slide.title;
  const titleFallback = lang === "de" ? slide.titleAr || slide.title : slide.titleDe;
  const subPreferred = lang === "de" ? slide.subtitleDe : slide.subtitleAr || slide.subtitle;
  const subFallback = lang === "de" ? slide.subtitleAr || slide.subtitle : slide.subtitleDe;
  const title = useAutoTranslate(lang, titlePreferred, titleFallback);
  const subtitle = useAutoTranslate(lang, subPreferred, subFallback);
  const href = slideHref(slide);

  const inner = (
    <>
      <Image
        src={slide.image}
        alt={title || slideTitle(lang, slide)}
        fill
        quality={SHOP_IMAGE_QUALITY}
        priority={priority}
        className="object-cover"
        sizes="100vw"
      />
      {(title || subtitle) && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
      )}
      {(title || subtitle) && (
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-5 md:p-6 text-start">
          {title ? (
            <h2 className="font-display text-lg sm:text-2xl md:text-3xl text-white drop-shadow-sm text-balance">
              {title}
            </h2>
          ) : null}
          {subtitle ? (
            <p className="font-ui text-xs sm:text-sm md:text-base text-white/90 mt-1 max-w-2xl line-clamp-2">
              {subtitle}
            </p>
          ) : null}
        </div>
      )}
      <span className="sr-only">{t("slideOf", { n: 1 })}</span>
    </>
  );

  if (href) {
    const external = href.startsWith("http");
    return (
      <Link
        href={href}
        className="absolute inset-0 block"
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {inner}
      </Link>
    );
  }

  return <div className="absolute inset-0">{inner}</div>;
}

export default function CompactBannerSlider({ slides, className }: CompactBannerSliderProps) {
  const { t } = useShopLocale();
  const [current, setCurrent] = useState(0);
  const multi = slides.length > 1;

  useEffect(() => {
    if (!multi) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [multi, slides.length]);

  if (!slides.length) return null;

  return (
    <section
      className={cn(
        "relative w-full overflow-hidden bg-jmle-mahogany",
        "h-[22vh] min-h-[140px] max-h-[220px] sm:h-[26vh] sm:max-h-[260px] md:h-[28vh] md:max-h-[300px]",
        className
      )}
    >
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={cn(
            "absolute inset-0 transition-opacity duration-700 ease-boutique",
            index === current ? "opacity-100 z-[1]" : "opacity-0 z-0 pointer-events-none"
          )}
          aria-hidden={index !== current}
        >
          <BannerSlideContent slide={slide} priority={index === 0} />
        </div>
      ))}

      {multi && (
        <>
          <button
            type="button"
            onClick={() => setCurrent((c) => (c - 1 + slides.length) % slides.length)}
            className="absolute start-2 top-1/2 z-[2] -translate-y-1/2 p-2 min-h-11 min-w-11 rounded-full bg-black/35 text-white hover:bg-brand-orange transition-colors"
            aria-label={t("slidePrev")}
          >
            <ChevronLeft size={20} className="rtl:rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => setCurrent((c) => (c + 1) % slides.length)}
            className="absolute end-2 top-1/2 z-[2] -translate-y-1/2 p-2 min-h-11 min-w-11 rounded-full bg-black/35 text-white hover:bg-brand-orange transition-colors"
            aria-label={t("slideNext")}
          >
            <ChevronRight size={20} className="rtl:rotate-180" />
          </button>
          <div className="absolute bottom-3 left-1/2 z-[2] -translate-x-1/2 flex gap-1.5">
            {slides.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setCurrent(index)}
                aria-label={t("slideOf", { n: index + 1 })}
                aria-current={index === current}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  index === current
                    ? "bg-brand-orange w-6 shadow-gold-sm"
                    : "w-1.5 bg-white/55 hover:bg-brand-orange/80"
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
