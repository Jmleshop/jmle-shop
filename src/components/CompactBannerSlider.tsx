"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Slide } from "@/types";
import { cn } from "@/lib/cn";
import { SHOP_IMAGE_QUALITY } from "@/lib/sharp-image";
import { useShopLocale } from "@/components/ShopLocale";
import { slideTitle } from "@/lib/shop-i18n";
import { useAutoTranslate } from "@/hooks/useAutoTranslate";

interface CompactBannerSliderProps {
  slides: Slide[];
  className?: string;
  /** Kompakter Banner (Banner 2/3) vs. großer Hero (Banner 1) */
  size?: "hero" | "compact";
}

function slideHref(slide: Slide): string | null {
  if (slide.linkCategoryId) return `/categories/${slide.linkCategoryId}`;
  if (slide.linkUrl) return slide.linkUrl;
  return null;
}

function BannerSlideContent({
  slide,
  priority,
}: {
  slide: Slide;
  priority?: boolean;
}) {
  const { lang, t } = useShopLocale();
  const titlePreferred = lang === "de" ? slide.titleDe : slide.titleAr || slide.title;
  const titleFallback = lang === "de" ? slide.titleAr || slide.title : slide.titleDe;
  const subPreferred = lang === "de" ? slide.subtitleDe : slide.subtitleAr || slide.subtitle;
  const subFallback = lang === "de" ? slide.subtitleAr || slide.subtitle : slide.subtitleDe;
  const title = useAutoTranslate(lang, titlePreferred, titleFallback);
  const subtitle = useAutoTranslate(lang, subPreferred, subFallback);
  const href = slideHref(slide);
  const mediaType = slide.mediaType || "image";
  const isParallax = mediaType === "parallax";

  const media =
    mediaType === "video" && slide.videoUrl ? (
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src={slide.videoUrl}
        poster={slide.image}
        autoPlay
        muted
        loop
        playsInline
        aria-label={title || slideTitle(lang, slide)}
      />
    ) : (
      <Image
        src={slide.image}
        alt={title || slideTitle(lang, slide)}
        fill
        quality={SHOP_IMAGE_QUALITY}
        priority={priority}
        className={cn("object-cover", isParallax && "scale-110 will-change-transform")}
        sizes="100vw"
        draggable={false}
      />
    );

  const inner = (
    <>
      {media}
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
        draggable={false}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {inner}
      </Link>
    );
  }

  return <div className="absolute inset-0">{inner}</div>;
}

export default function CompactBannerSlider({
  slides,
  className,
  size = "compact",
}: CompactBannerSliderProps) {
  const { t } = useShopLocale();
  const [current, setCurrent] = useState(0);
  const multi = slides.length > 1;
  const touchX = useRef<number | null>(null);
  const dragX = useRef<number | null>(null);
  const pausedUntil = useRef(0);
  const sectionRef = useRef<HTMLElement>(null);

  const pauseAuto = useCallback(() => {
    pausedUntil.current = Date.now() + 6000;
  }, []);

  const go = useCallback(
    (dir: -1 | 1) => {
      if (!multi) return;
      setCurrent((prev) => (prev + dir + slides.length) % slides.length);
    },
    [multi, slides.length]
  );

  useEffect(() => {
    if (!multi) return;
    const timer = setInterval(() => {
      if (Date.now() < pausedUntil.current) return;
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [multi, slides.length]);

  if (!slides.length) return null;

  const sizeClass =
    size === "hero"
      ? "h-[42vh] min-h-[200px] max-h-[420px] sm:h-[52vh] sm:max-h-[520px] md:h-[58vh] md:max-h-[600px]"
      : "h-[22vh] min-h-[140px] max-h-[220px] sm:h-[26vh] sm:max-h-[260px] md:h-[28vh] md:max-h-[300px]";

  return (
    <section
      ref={sectionRef}
      className={cn(
        "relative w-full overflow-hidden bg-jmle-mahogany select-none touch-pan-y",
        sizeClass,
        className
      )}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchMove={(e) => {
        if (touchX.current == null) return;
        const dx = Math.abs(e.touches[0].clientX - touchX.current);
        if (dx > 12) e.stopPropagation();
      }}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) {
          pauseAuto();
          go(dx < 0 ? 1 : -1);
        }
        touchX.current = null;
      }}
      onPointerDown={(e) => {
        if (e.pointerType === "touch") return;
        dragX.current = e.clientX;
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      }}
      onPointerUp={(e) => {
        if (dragX.current == null) return;
        const dx = e.clientX - dragX.current;
        if (Math.abs(dx) > 48) {
          pauseAuto();
          go(dx < 0 ? 1 : -1);
        }
        dragX.current = null;
      }}
      onPointerCancel={() => {
        dragX.current = null;
      }}
      role="region"
      aria-roledescription="Karussell"
      aria-label={t("slideOf", { n: current + 1 })}
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
        <div className="absolute bottom-3 left-1/2 z-[2] -translate-x-1/2 flex gap-1.5">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                pauseAuto();
                setCurrent(index);
              }}
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
      )}
    </section>
  );
}
