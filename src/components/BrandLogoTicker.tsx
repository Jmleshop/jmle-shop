"use client";

import { useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BrandLogo } from "@/types";
import { originalImageSrc, SHOP_IMAGE_QUALITY } from "@/lib/sharp-image";
import { useShopLocale } from "@/components/ShopLocale";
import { cn } from "@/lib/cn";

interface BrandLogoTickerProps {
  logos: BrandLogo[];
  className?: string;
  /** Optionale Überschrift — leer = kein Abstand/kein Titel */
  title?: string;
}

/** Kundenansicht: immer zur internen Marken-Produktseite (keine externen Ablenkungen). */
function brandHref(logo: BrandLogo): string {
  return `/brands/${encodeURIComponent(logo.id)}`;
}

function LogoItem({ logo }: { logo: BrandLogo }) {
  const { t } = useShopLocale();
  const href = brandHref(logo);
  const label = (logo.name || "").trim() || t("brandPartners");
  return (
    <Link
      href={href}
      className="layout-brands-item"
      aria-label={label}
      title={label}
    >
      <div className="layout-brands-logo relative shrink-0 opacity-90 transition-opacity hover:opacity-100">
        <Image
          src={originalImageSrc(logo.image)}
          alt={label}
          fill
          quality={SHOP_IMAGE_QUALITY}
          className="object-contain"
          sizes="(max-width: 768px) 80px, 112px"
        />
      </div>
    </Link>
  );
}

export default function BrandLogoTicker({
  logos,
  className,
  title,
}: BrandLogoTickerProps) {
  const { t } = useShopLocale();
  const trackRef = useRef<HTMLDivElement>(null);
  const shiftRef = useRef(0);

  const nudge = useCallback((dir: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    const item = track.querySelector<HTMLElement>(".layout-brands-item");
    const step = Math.max(64, item?.offsetWidth || 96);
    const loopWidth = track.scrollWidth > 0 ? track.scrollWidth / 2 : 0;

    // dir -1 = vorwärts (Track nach links), +1 = zurück
    shiftRef.current += dir * step;
    if (loopWidth > 0) {
      while (shiftRef.current <= -loopWidth) shiftRef.current += loopWidth;
      while (shiftRef.current > 0) shiftRef.current -= loopWidth;
    }
    track.style.setProperty("--marquee-shift", `${shiftRef.current}px`);
  }, []);

  if (!logos.length) return null;

  const heading = (title ?? "").trim();
  const loop = logos.length === 1 ? logos : [...logos, ...logos];
  const baseDuration = Math.max(18, logos.length * 4);
  const showArrows = logos.length > 1;

  return (
    <section
      data-home-section="brands"
      className={cn("layout-brands-frame", className)}
      aria-label={heading || t("brandPartners")}
    >
      {heading ? (
        <div className="layout-section-title-wrap mb-2 sm:mb-3 px-4">
          <h2 className="section-title text-base sm:text-lg">{heading}</h2>
        </div>
      ) : null}
      <div className="layout-brands-ticker relative">
        {showArrows ? (
          <button
            type="button"
            className="layout-brands-nav layout-brands-nav--prev"
            onClick={() => nudge(1)}
            aria-label={t("pagePrev")}
          >
            <ChevronLeft size={20} className="rtl:rotate-180" aria-hidden />
          </button>
        ) : null}
        <div
          className="jmle-marquee overflow-hidden bg-transparent"
          style={
            {
              ["--marquee-duration" as string]: `calc(${baseDuration}s / var(--layout-brands-speed, 1))`,
            } as React.CSSProperties
          }
        >
          <div
            ref={trackRef}
            className="jmle-marquee-track items-center"
            style={
              {
                ["--marquee-shift" as string]: "0px",
              } as React.CSSProperties
            }
          >
            {loop.map((logo, i) => (
              <LogoItem key={`${logo.id}-${i}`} logo={logo} />
            ))}
          </div>
        </div>
        {showArrows ? (
          <button
            type="button"
            className="layout-brands-nav layout-brands-nav--next"
            onClick={() => nudge(-1)}
            aria-label={t("pageNext")}
          >
            <ChevronRight size={20} className="rtl:rotate-180" aria-hidden />
          </button>
        ) : null}
      </div>
    </section>
  );
}
