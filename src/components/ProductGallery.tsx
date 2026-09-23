"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
    }, 4000);
    return () => clearInterval(t);
  }, [next, slides.length]);

  return (
    <div
      className={`relative aspect-square bg-jmle-warm overflow-hidden rounded-2xl ${
        dimmed ? "opacity-60" : ""
      }`}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) {
          pauseAuto();
          if (dx < 0) next();
          else prev();
        }
        touchX.current = null;
      }}
    >
      <Image
        src={slides[index]}
        alt={alt}
        fill
        priority
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 50vw"
      />
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => {
              pauseAuto();
              prev();
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white"
            aria-label="Vorheriges Bild"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => {
              pauseAuto();
              next();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white"
            aria-label="Nächstes Bild"
          >
            <ChevronRight size={18} />
          </button>
          <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  pauseAuto();
                  setIndex(i);
                }}
                className={`h-1.5 rounded-full ${
                  i === index ? "w-5 bg-gold" : "w-1.5 bg-white/70"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
