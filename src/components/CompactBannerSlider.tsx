"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Slide } from "@/types";
import { cn } from "@/lib/cn";
import {
  originalImageSrc,
  SHOP_IMAGE_QUALITY,
  vercelOptimizedImageSrc,
} from "@/lib/sharp-image";
import { useShopLocale } from "@/components/ShopLocale";
import { slideTitle } from "@/lib/shop-i18n";
import { useAutoTranslate } from "@/hooks/useAutoTranslate";
import { isPlaceholderSlideCaption } from "@/lib/homepage-sections";

interface CompactBannerSliderProps {
  slides: Slide[];
  className?: string;
  /** Einzelbild statt Autoplay-Karussell */
  single?: boolean;
  /** Autoplay-Intervall in ms */
  intervalMs?: number;
}

/**
 * Banner-Rahmen: Aspect/Höhe/Abstand kommen aus CSS-Variablen
 * (--layout-banner-*), gesteuert vom Page-Builder.
 */
export const BANNER_FRAME_CLASS =
  "relative w-full min-h-0 overflow-hidden bg-jmle-cream layout-banner-frame";

function slideHref(slide: Slide): string | null {
  if (slide.linkCategoryId) return `/categories/${slide.linkCategoryId}`;
  if (slide.linkUrl) return slide.linkUrl;
  return null;
}

function BannerSlideContent({
  slide,
  priority,
  onImageLoad,
}: {
  slide: Slide;
  priority?: boolean;
  onImageLoad?: (img: HTMLImageElement) => void;
}) {
  const { lang } = useShopLocale();
  const titlePreferred = lang === "de" ? slide.titleDe : slide.titleAr || slide.title;
  const titleFallback = lang === "de" ? slide.titleAr || slide.title : slide.titleDe;
  const subPreferred = lang === "de" ? slide.subtitleDe : slide.subtitleAr || slide.subtitle;
  const subFallback = lang === "de" ? slide.subtitleAr || slide.subtitle : slide.subtitleDe;
  const titleRaw = useAutoTranslate(lang, titlePreferred, titleFallback);
  const subtitleRaw = useAutoTranslate(lang, subPreferred, subFallback);
  const title = isPlaceholderSlideCaption(titleRaw) ? "" : titleRaw.trim();
  const subtitle = isPlaceholderSlideCaption(subtitleRaw) ? "" : subtitleRaw.trim();
  const href = slideHref(slide);
  const mediaType = slide.mediaType || "image";
  const showCaption = Boolean(title || subtitle);

  const media =
    mediaType === "video" && slide.videoUrl ? (
      <video
        className="absolute inset-0 h-full w-full layout-banner-media"
        src={slide.videoUrl}
        poster={vercelOptimizedImageSrc(slide.image, 1080)}
        autoPlay
        muted
        loop
        playsInline
        aria-label={title || slideTitle(lang, slide) || "Banner"}
      />
    ) : (
      <Image
        src={originalImageSrc(slide.image) || "/placeholder.svg"}
        alt={title || slideTitle(lang, slide) || "Banner"}
        fill
        quality={SHOP_IMAGE_QUALITY}
        priority={priority}
        className="layout-banner-media"
        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 100vw, 1280px"
        draggable={false}
        onLoad={onImageLoad ? (e) => onImageLoad(e.currentTarget) : undefined}
      />
    );

  const inner = (
    <>
      {media}
      {showCaption && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] bg-gradient-to-t from-black/55 via-black/10 to-transparent p-3 sm:p-4 md:p-5 text-start">
          {title ? (
            <h2 className="font-display text-base sm:text-xl md:text-2xl text-white drop-shadow-sm text-balance">
              {title}
            </h2>
          ) : null}
          {subtitle ? (
            <p className="font-ui text-xs sm:text-sm text-white/95 mt-0.5 max-w-2xl line-clamp-2">
              {subtitle}
            </p>
          ) : null}
        </div>
      )}
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

/** Standard-Intervall für den automatischen Folienwechsel */
export const BANNER_AUTOPLAY_MS = 5000;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

export default function CompactBannerSlider({
  slides,
  className,
  single = false,
  intervalMs = BANNER_AUTOPLAY_MS,
}: CompactBannerSliderProps) {
  const { lang, t } = useShopLocale();
  const rtl = lang === "ar";
  const [current, setCurrent] = useState(0);
  const multi = !single && slides.length > 1;
  const frameRef = useRef<HTMLElement | null>(null);
  const touchX = useRef<number | null>(null);
  const dragX = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const reducedMotion = usePrefersReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  /** Seitenverhältnis des ersten Bildes — verhindert Leerflächen bei object-fit: contain */
  const [naturalAspect, setNaturalAspect] = useState<number | null>(null);

  const count = slides.length;
  const safeCurrent = count ? current % count : 0;

  const go = useCallback(
    (dir: -1 | 1) => {
      if (!multi) return;
      setCurrent((prev) => (prev + dir + count) % count);
    },
    [multi, count]
  );

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.visibilityState === "hidden");
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const autoplay = multi && !reducedMotion && !hovered && !focused && !tabHidden;

  // Ein einziger Timer pro Folie: jeder Wechsel (auto oder manuell) startet ihn neu.
  useEffect(() => {
    if (!autoplay) return;
    const timer = window.setTimeout(() => {
      setCurrent((prev) => (prev + 1) % count);
    }, Math.max(2000, intervalMs));
    return () => window.clearTimeout(timer);
  }, [autoplay, safeCurrent, count, intervalMs]);

  const onFirstImageLoad = useCallback((img: HTMLImageElement) => {
    if (!img.naturalWidth || !img.naturalHeight) return;
    const frame = frameRef.current;
    if (!frame) return;
    const cs = getComputedStyle(frame);
    // Nur bei Auto-Höhe + contain: feste Builder-Höhe/cover bleiben unverändert.
    const fit = cs.getPropertyValue("--layout-banner-object-fit").trim() || "contain";
    const height = cs.getPropertyValue("--layout-banner-height").trim() || "auto";
    if (fit !== "contain" || height !== "auto") return;
    setNaturalAspect(img.naturalWidth / img.naturalHeight);
  }, []);

  if (!count) return null;

  const visible = single ? slides.slice(0, 1) : slides;
  // Im RTL-Layout zeigt „vorwärts“ nach links.
  const swipeToDir = (dx: number): -1 | 1 => {
    const forward = rtl ? dx > 0 : dx < 0;
    return forward ? 1 : -1;
  };

  return (
    <section
      ref={frameRef}
      className={cn(
        "w-full select-none touch-pan-y group/banner",
        BANNER_FRAME_CLASS,
        className
      )}
      style={naturalAspect ? { aspectRatio: String(naturalAspect) } : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      onKeyDown={(e) => {
        if (!multi) return;
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          go(rtl ? 1 : -1);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          go(rtl ? -1 : 1);
        }
      }}
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
        if (Math.abs(dx) > 40) go(swipeToDir(dx));
        touchX.current = null;
      }}
      onPointerDown={(e) => {
        if (e.pointerType === "touch" || e.button !== 0) return;
        if ((e.target as HTMLElement).closest("button")) return;
        dragX.current = e.clientX;
      }}
      onPointerUp={(e) => {
        if (dragX.current == null) return;
        const dx = e.clientX - dragX.current;
        if (Math.abs(dx) > 48) {
          suppressClick.current = true;
          go(swipeToDir(dx));
        }
        dragX.current = null;
      }}
      onPointerCancel={() => {
        dragX.current = null;
      }}
      onClickCapture={(e) => {
        // Nach einem Maus-Wischen keinen Banner-Link auslösen
        if (!suppressClick.current) return;
        suppressClick.current = false;
        e.preventDefault();
        e.stopPropagation();
      }}
      role={multi ? "region" : undefined}
      aria-roledescription={multi ? "carousel" : undefined}
      aria-label={multi ? t("bannerCarousel") : undefined}
    >
      {visible.map((slide, index) => {
        const active = index === safeCurrent || single;
        return (
          <div
            key={slide.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-700 ease-boutique motion-reduce:transition-none",
              active ? "opacity-100 z-[1]" : "opacity-0 z-0 pointer-events-none"
            )}
            role={multi ? "group" : undefined}
            aria-roledescription={multi ? "slide" : undefined}
            aria-label={multi ? t("slideXofY", { n: index + 1, total: count }) : undefined}
            aria-hidden={!active}
            inert={!active}
          >
            <BannerSlideContent
              slide={slide}
              priority={index === 0}
              onImageLoad={index === 0 ? onFirstImageLoad : undefined}
            />
          </div>
        );
      })}

      {multi && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label={t("slidePrev")}
            className="absolute start-2 top-1/2 z-[2] hidden -translate-y-1/2 md:inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-luxury-ink shadow-md opacity-0 transition-opacity group-hover/banner:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
          >
            <ChevronLeft size={20} className="rtl:rotate-180" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label={t("slideNext")}
            className="absolute end-2 top-1/2 z-[2] hidden -translate-y-1/2 md:inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-luxury-ink shadow-md opacity-0 transition-opacity group-hover/banner:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
          >
            <ChevronRight size={20} className="rtl:rotate-180" aria-hidden />
          </button>
          <div className="absolute bottom-2 left-1/2 z-[2] -translate-x-1/2 flex gap-1.5">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setCurrent(index)}
                aria-label={t("slideXofY", { n: index + 1, total: count })}
                aria-current={index === safeCurrent}
                className="flex h-6 min-w-6 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange rounded-full"
              >
                <span
                  className={cn(
                    "block h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none",
                    index === safeCurrent
                      ? "bg-brand-orange w-6 shadow-gold-sm"
                      : "w-1.5 bg-white/70 hover:bg-brand-orange/80"
                  )}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
