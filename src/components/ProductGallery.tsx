"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

export default function ProductGallery({
  images,
  alt,
  dimmed,
}: {
  images: string[];
  alt: string;
  dimmed?: boolean;
}) {
  const slides = images.length ? images : ["/placeholder.svg"];
  const [index, setIndex] = useState(0);
  const pausedUntil = useRef(0);
  const touchX = useRef<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const pauseAuto = useCallback(() => {
    pausedUntil.current = Date.now() + 8000;
  }, []);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => {
      if (Date.now() >= pausedUntil.current) next();
    }, 4500);
    return () => clearInterval(t);
  }, [next, slides.length]);

  return (
    <div
      className={cn(
        "relative aspect-square bg-jmle-warm overflow-hidden rounded-2xl border border-amber-200/40 shadow-boutique select-none touch-pan-y",
        dimmed && "opacity-60"
      )}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchMove={(e) => {
        // Horizontal-Wisch priorisieren, wenn Delta groß genug
        if (touchX.current == null) return;
        const dx = Math.abs(e.touches[0].clientX - touchX.current);
        if (dx > 12) e.stopPropagation();
      }}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 36) {
          pauseAuto();
          if (dx < 0) next();
          else prev();
        }
        touchX.current = null;
      }}
      role="region"
      aria-roledescription="Karussell"
      aria-label={alt}
    >
      <div
        ref={trackRef}
        dir="ltr"
        className="absolute inset-0 flex transition-transform duration-500 ease-boutique"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((src, i) => (
          <div key={`${src}-${i}`} className="relative min-w-full h-full">
            <Image
              src={src}
              alt={i === index ? alt : ""}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <>
          {/* In RTL: start = rechts */}
          <button
            type="button"
            onClick={() => {
              pauseAuto();
              next();
            }}
            className="absolute start-2 top-1/2 -translate-y-1/2 p-2.5 min-h-11 min-w-11 rounded-full bg-white/85 backdrop-blur-sm border border-amber-200/50 text-luxury-ink shadow-gold-sm hover:bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
            aria-label="الصورة التالية"
          >
            <ChevronRight size={18} className="rtl:rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => {
              pauseAuto();
              prev();
            }}
            className="absolute end-2 top-1/2 -translate-y-1/2 p-2.5 min-h-11 min-w-11 rounded-full bg-white/85 backdrop-blur-sm border border-amber-200/50 text-luxury-ink shadow-gold-sm hover:bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
            aria-label="الصورة السابقة"
          >
            <ChevronLeft size={18} className="rtl:rotate-180" />
          </button>

          <div
            className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5"
            role="tablist"
            aria-label="صور المنتج"
          >
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`صورة ${i + 1}`}
                onClick={() => {
                  pauseAuto();
                  setIndex(i);
                }}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i === index
                    ? "w-6 bg-gold shadow-gold-sm"
                    : "w-2 bg-white/75 hover:bg-jmle-yellow"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
