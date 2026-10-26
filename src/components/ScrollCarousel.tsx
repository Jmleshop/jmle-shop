"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useShopLocale } from "@/components/ShopLocale";
import { cn } from "@/lib/cn";

/**
 * Horizontales Karussell auf Basis von nativem Scrollen (scroll-snap):
 * Wischen, Pfeile, Tastatur und Autoplay teilen dieselbe Scroll-Position.
 * Kein Duplizieren der Liste, keine konkurrierenden CSS-Animationen.
 */
export default function ScrollCarousel({
  children,
  label,
  autoplayMs = 0,
  className,
  trackClassName,
}: {
  children: ReactNode;
  label: string;
  /** 0 = kein Autoplay */
  autoplayMs?: number;
  className?: string;
  trackClassName?: string;
}) {
  const { lang, t } = useShopLocale();
  const rtl = lang === "ar";
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const resumeTimer = useRef<number | null>(null);

  const updateEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    // In RTL ist scrollLeft ≤ 0 — Betrag funktioniert für beide Richtungen.
    const pos = Math.abs(el.scrollLeft);
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(pos > 2);
    setCanNext(pos < max - 2);
  }, []);

  useEffect(() => {
    updateEdges();
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateEdges, children]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMq = () => setReducedMotion(mq.matches);
    const onVis = () => setTabHidden(document.visibilityState === "hidden");
    onMq();
    onVis();
    mq.addEventListener("change", onMq);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      mq.removeEventListener("change", onMq);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const step = useCallback(() => {
    const el = trackRef.current;
    if (!el) return 0;
    const first = el.firstElementChild as HTMLElement | null;
    const item = first?.getBoundingClientRect().width ?? 160;
    // Ganze Karten weiterschalten, mindestens eine
    return Math.max(item, Math.floor(el.clientWidth / item) * item);
  }, []);

  const scrollDir = useCallback(
    (dir: -1 | 1, wrap = false) => {
      const el = trackRef.current;
      if (!el) return;
      const pos = Math.abs(el.scrollLeft);
      const max = el.scrollWidth - el.clientWidth;
      const behavior: ScrollBehavior = reducedMotion ? "auto" : "smooth";
      if (wrap && dir === 1 && pos >= max - 2) {
        el.scrollTo({ left: 0, behavior });
        return;
      }
      const delta = step() * dir * (rtl ? -1 : 1);
      el.scrollBy({ left: delta, behavior });
    },
    [rtl, step, reducedMotion]
  );

  const pauseBriefly = useCallback(() => {
    setInteracting(true);
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setInteracting(false), 6000);
  }, []);

  useEffect(
    () => () => {
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    },
    []
  );

  const autoplay =
    autoplayMs > 0 && !reducedMotion && !interacting && !tabHidden;

  useEffect(() => {
    if (!autoplay) return;
    const timer = window.setInterval(() => scrollDir(1, true), autoplayMs);
    return () => window.clearInterval(timer);
  }, [autoplay, autoplayMs, scrollDir]);

  const arrowClass =
    "absolute top-1/2 z-10 hidden -translate-y-1/2 md:inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-luxury-ink shadow-md ring-1 ring-orange-100 transition-opacity hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange disabled:pointer-events-none disabled:opacity-0";

  return (
    <div
      className={cn("relative w-full", className)}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocus={() => setInteracting(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setInteracting(false);
        }
      }}
      onTouchStart={pauseBriefly}
    >
      <div
        ref={trackRef}
        onScroll={updateEdges}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "ArrowRight") {
            e.preventDefault();
            scrollDir(rtl ? -1 : 1);
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            scrollDir(rtl ? 1 : -1);
          }
        }}
        className={cn(
          "flex w-full overflow-x-auto overscroll-x-contain snap-x snap-mandatory scroll-smooth motion-reduce:scroll-auto",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50 rounded-xl",
          trackClassName
        )}
      >
        {children}
      </div>
      <button
        type="button"
        onClick={() => {
          pauseBriefly();
          scrollDir(-1);
        }}
        disabled={!canPrev}
        aria-label={t("slidePrev")}
        className={cn(arrowClass, "start-1")}
      >
        <ChevronLeft size={20} className="rtl:rotate-180" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => {
          pauseBriefly();
          scrollDir(1);
        }}
        disabled={!canNext}
        aria-label={t("slideNext")}
        className={cn(arrowClass, "end-1")}
      >
        <ChevronRight size={20} className="rtl:rotate-180" aria-hidden />
      </button>
    </div>
  );
}
