"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useShopLocale } from "@/components/ShopLocale";
import { cn } from "@/lib/cn";

/**
 * Horizontales Karussell auf Basis von nativem Scrollen:
 * Wischen, Pfeile, Tastatur und Autoplay teilen dieselbe Scroll-Position.
 *
 * - `autoplayMs`: schaltet schrittweise weiter (mit scroll-snap).
 * - `speed`: läuft durchgehend und endlos (px/s). Dafür wird die Liste
 *   als stille Kopie (aria-hidden, inert) wiederholt; beim Erreichen der
 *   ersten Kopie springt die Position unsichtbar um eine Periode zurück.
 */
export default function ScrollCarousel({
  children,
  label,
  autoplayMs = 0,
  speed = 0,
  reverse = false,
  className,
  trackClassName,
}: {
  children: ReactNode;
  label: string;
  /** 0 = kein schrittweises Autoplay */
  autoplayMs?: number;
  /** Pixel pro Sekunde für durchgehenden Lauf; 0 = aus */
  speed?: number;
  /** Durchgehender Lauf in Gegenrichtung */
  reverse?: boolean;
  className?: string;
  trackClassName?: string;
}) {
  const continuous = speed > 0;
  const { lang, t } = useShopLocale();
  const rtl = lang === "ar";
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const resumeTimer = useRef<number | null>(null);
  /** Anzahl der Listen-Durchläufe im Track (1 = keine Kopie) */
  const [copies, setCopies] = useState(continuous ? 2 : 1);

  /** Breite eines Listen-Durchlaufs inkl. Abstand (0 = nicht messbar) */
  const measurePeriod = useCallback((): number => {
    const el = trackRef.current;
    if (!el) return 0;
    const first = el.querySelector<HTMLElement>("[data-copy='0'] > *");
    const second = el.querySelector<HTMLElement>("[data-copy='1'] > *");
    if (!first || !second) return 0;
    return Math.abs(second.offsetLeft - first.offsetLeft);
  }, []);

  // Genug Kopien, damit hinter einer Periode immer noch eine volle Breite folgt
  useLayoutEffect(() => {
    if (!continuous) return;
    const el = trackRef.current;
    if (!el) return;
    const update = () => {
      const period = measurePeriod();
      if (!period) return;
      const needed = Math.max(2, Math.ceil(el.clientWidth / period) + 1);
      setCopies((prev) => (prev === needed ? prev : needed));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [continuous, measurePeriod, children]);

  const updateEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    // In RTL ist scrollLeft ≤ 0 — Betrag funktioniert für beide Richtungen.
    const pos = Math.abs(el.scrollLeft);
    const max = el.scrollWidth - el.clientWidth;
    // Endlos-Lauf: beide Richtungen sind immer möglich
    setCanPrev(continuous ? max > 2 : pos > 2);
    setCanNext(continuous ? max > 2 : pos < max - 2);
  }, [continuous]);

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
    const first = el.querySelector<HTMLElement>("[data-copy='0'] > *");
    const item = first?.getBoundingClientRect().width || 160;
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
    resumeTimer.current = window.setTimeout(
      () => setInteracting(false),
      continuous ? 3000 : 6000
    );
  }, [continuous]);

  useEffect(
    () => () => {
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    },
    []
  );

  const autoplay =
    !continuous && autoplayMs > 0 && !reducedMotion && !interacting && !tabHidden;

  useEffect(() => {
    if (!autoplay) return;
    const timer = window.setInterval(() => scrollDir(1, true), autoplayMs);
    return () => window.clearInterval(timer);
  }, [autoplay, autoplayMs, scrollDir]);

  const running = continuous && !reducedMotion && !interacting && !tabHidden;

  // Durchgehender Lauf: eigene Kommazahl-Position, weil scrollLeft gerundet wird
  useEffect(() => {
    const el = trackRef.current;
    if (!running || !el) return;
    let raf = 0;
    let last = performance.now();
    let pos = Math.abs(el.scrollLeft);
    const dir = reverse ? -1 : 1;
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const actual = Math.abs(el.scrollLeft);
      if (Math.abs(actual - pos) > 2) pos = actual; // per Hand verschoben
      const period = measurePeriod();
      if (period > 0) {
        pos += (dir * speed * dt) / 1000;
        pos = ((pos % period) + period) % period;
        el.scrollLeft = rtl ? -pos : pos;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, speed, reverse, rtl, measurePeriod]);

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
      onTouchEnd={pauseBriefly}
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
          "flex w-full overflow-x-auto overscroll-x-contain",
          // Snap/Smooth-Scroll würden den durchgehenden Lauf ruckeln lassen
          !continuous && "snap-x snap-mandatory scroll-smooth motion-reduce:scroll-auto",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50 rounded-xl",
          trackClassName
        )}
      >
        {continuous ? (
          Array.from({ length: copies }, (_, i) => (
            <div
              key={i}
              data-copy={i}
              className="contents"
              aria-hidden={i > 0 || undefined}
              inert={i > 0}
            >
              {children}
            </div>
          ))
        ) : (
          <div data-copy={0} className="contents">
            {children}
          </div>
        )}
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
