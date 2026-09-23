"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { Slide } from "@/types";
import { cn } from "@/lib/cn";

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
    <section className="relative w-full h-[52vh] md:h-[72vh] overflow-hidden bg-jmle-mahogany">
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
            priority={index === 0}
            className="object-cover scale-105"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-jmle-mahogany/80 via-gold-dark/25 to-transparent" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <p className="font-ui text-jmle-yellow/90 text-xs md:text-sm tracking-[0.35em] uppercase mb-3">
              jmle
            </p>
            <h2 className="font-display text-3xl md:text-5xl lg:text-6xl text-white mb-3 text-balance drop-shadow-sm">
              {slide.title}
            </h2>
            <p className="font-ui text-base md:text-xl text-jmle-ocher/95 font-light max-w-xl">
              {slide.subtitle}
            </p>
          </div>
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
