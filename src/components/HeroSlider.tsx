"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { Slide } from "@/types";
import { cn } from "@/lib/cn";
import { SHOP_IMAGE_QUALITY } from "@/lib/sharp-image";

interface HeroSliderProps {
  slides: Slide[];
}

export default function HeroSlider({ slides }: HeroSliderProps) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (!slides.length) return null;

  return (
    <section className="relative w-full h-40 sm:h-48 md:h-64 lg:h-72 overflow-hidden bg-jmle-cream">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={cn(
            "absolute inset-0 transition-opacity duration-700 ease-boutique",
            index === current ? "opacity-100" : "opacity-0"
          )}
          aria-hidden={index !== current}
        >
          <Image
            src={slide.image}
            alt={slide.title}
            fill
            quality={SHOP_IMAGE_QUALITY}
            priority={index === 0}
            className="object-contain object-center"
            sizes="100vw"
          />
          {(slide.title || slide.subtitle) && (
            <div className="absolute inset-0 bg-gradient-to-t from-jmle-mahogany/55 via-transparent to-transparent pointer-events-none" />
          )}
          {(slide.title || slide.subtitle) && (
            <div className="absolute inset-x-0 bottom-0 p-4 md:p-6 text-center">
              {slide.title ? (
                <h2 className="font-display text-xl md:text-3xl text-white drop-shadow-sm text-balance">
                  {slide.title}
                </h2>
              ) : null}
              {slide.subtitle ? (
                <p className="font-ui text-sm md:text-base text-white/95 mt-1 max-w-xl mx-auto line-clamp-2">
                  {slide.subtitle}
                </p>
              ) : null}
            </div>
          )}
        </div>
      ))}

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setCurrent(index)}
            aria-label={`الشريحة ${index + 1}`}
            aria-current={index === current}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              index === current
                ? "bg-jmle-yellow w-7 shadow-gold-sm"
                : "w-2 bg-white/55 hover:bg-jmle-yellow/80"
            )}
          />
        ))}
      </div>
    </section>
  );
}
