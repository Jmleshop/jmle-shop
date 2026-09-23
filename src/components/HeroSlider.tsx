"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Slide } from "@/types";

interface HeroSliderProps {
  slides: Slide[];
}

export default function HeroSlider({ slides }: HeroSliderProps) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <section className="relative w-full h-[50vh] md:h-[70vh] overflow-hidden bg-jmle-orange-dark">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            index === current ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={slide.image}
            alt={slide.title}
            fill
            priority={index === 0}
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-jmle-orange-dark/70 via-gold/20 to-transparent" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <h2 className="text-3xl md:text-5xl font-light text-white mb-3 tracking-wide">
              {slide.title}
            </h2>
            <p className="text-lg md:text-xl text-jmle-yellow font-light">
              {slide.subtitle}
            </p>
          </div>
        </div>
      ))}

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            aria-label={`الشريحة ${index + 1}`}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === current
                ? "bg-jmle-yellow w-6"
                : "bg-white/60 hover:bg-jmle-yellow/80"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
