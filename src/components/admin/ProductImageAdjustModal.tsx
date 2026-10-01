"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Minus, Plus, RotateCcw, X } from "lucide-react";
import { useAdminI18n } from "@/components/admin/AdminI18n";
import {
  IMAGE_BG_PRODUCT,
  MAX_EDGE_PRODUCT,
  STORAGE_WEBP_QUALITY,
} from "@/lib/image-policy";
import { PRODUCT_FILL } from "@/lib/image-editor/product-bounds";
import { bitmapFromBlob, loadSourceBlob } from "@/lib/image-editor/render";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.05;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Weiße Produktkarte + Zoom/Pan — Export matched die Vorschau. */
export function renderWhiteProductCard(
  bitmap: ImageBitmap,
  zoom: number,
  panX: number,
  panY: number,
  size = MAX_EDGE_PRODUCT,
  fill = PRODUCT_FILL
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas nicht verfügbar");

  ctx.fillStyle = IMAGE_BG_PRODUCT;
  ctx.fillRect(0, 0, size, size);

  const base = Math.min(
    (size * fill) / Math.max(1, bitmap.width),
    (size * fill) / Math.max(1, bitmap.height)
  );
  const scale = base * clamp(zoom, MIN_ZOOM, MAX_ZOOM);
  const dw = bitmap.width * scale;
  const dh = bitmap.height * scale;
  const dx = (size - dw) / 2 + panX * (size * 0.5);
  const dy = (size - dh) / 2 + panY * (size * 0.5);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, dx, dy, dw, dh);
  return canvas;
}

export default function ProductImageAdjustModal({
  source,
  step,
  onComplete,
  onCancel,
}: {
  source: File | string;
  step?: { current: number; total: number };
  onComplete: (file: File) => void;
  onCancel: () => void;
}) {
  const { lang } = useAdminI18n();
  const de = lang === "de";

  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [tick, setTick] = useState(0);

  const bitmapRef = useRef<ImageBitmap | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{
    x: number;
    y: number;
    panX: number;
    panY: number;
  } | null>(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const blob = await loadSourceBlob(source);
        const bitmap = await bitmapFromBlob(blob);
        if (cancelled) {
          bitmap.close();
          return;
        }
        bitmapRef.current?.close();
        bitmapRef.current = bitmap;
        setZoom(1);
        setPanX(0);
        setPanY(0);
        setPhase("ready");
        setTick((n) => n + 1);
      } catch (cause) {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : de
              ? "Bild konnte nicht geladen werden"
              : "تعذر تحميل الصورة"
        );
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
      try {
        bitmapRef.current?.close();
      } catch {
        /* ignore */
      }
      bitmapRef.current = null;
    };
  }, [source, de]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    const bitmap = bitmapRef.current;
    if (!canvas || !stage || !bitmap || phase !== "ready") return;

    const paint = () => {
      const css = Math.max(1, Math.round(stage.clientWidth));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const size = Math.max(1, Math.round(css * dpr));
      const drawn = renderWhiteProductCard(bitmap, zoom, panX, panY, size);
      canvas.width = size;
      canvas.height = size;
      canvas.style.width = `${css}px`;
      canvas.style.height = `${css}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(drawn, 0, 0);
    };

    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [phase, zoom, panX, panY, tick]);

  const reset = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  const nudgeZoom = (delta: number) => {
    setZoom((z) => clamp(Math.round((z + delta) * 100) / 100, MIN_ZOOM, MAX_ZOOM));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, panX, panY };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    const stage = stageRef.current;
    if (!drag || !stage) return;
    const rect = stage.getBoundingClientRect();
    const half = Math.max(1, rect.width * 0.5);
    const dx = (e.clientX - drag.x) / half;
    const dy = (e.clientY - drag.y) / half;
    setPanX(clamp(drag.panX + dx, -1.2, 1.2));
    setPanY(clamp(drag.panY + dy, -1.2, 1.2));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const save = useCallback(async () => {
    const bitmap = bitmapRef.current;
    if (!bitmap || busy) return;
    setBusy(true);
    setError("");
    try {
      const canvas = renderWhiteProductCard(bitmap, zoom, panX, panY);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", STORAGE_WEBP_QUALITY)
      );
      if (!blob) throw new Error(de ? "Export fehlgeschlagen" : "فشل التصدير");
      onComplete(new File([blob], `product-${Date.now()}.webp`, { type: "image/webp" }));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : de
            ? "Speichern fehlgeschlagen"
            : "فشل الحفظ"
      );
      setBusy(false);
    }
  }, [busy, zoom, panX, panY, onComplete, de]);

  if (typeof document === "undefined") return null;

  const title = de ? "Produktbild anpassen" : "ضبط صورة المنتج";
  const hint = de
    ? "Live-Vorschau auf weißer Produktkarte. Zoomen und per Ziehen verschieben."
    : "معاينة مباشرة على بطاقة بيضاء. قرّب واسحب للتحريك.";

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex max-h-[96vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-luxury-ink">{title}</h2>
            {step && (
              <p className="text-xs text-gray-500">
                {step.current} / {step.total}
              </p>
            )}
          </div>
          <button
            type="button"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-gray-200"
            onClick={onCancel}
            disabled={busy}
            aria-label={de ? "Schließen" : "إغلاق"}
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-4">
          <p className="text-xs text-gray-500">{hint}</p>

          <div
            ref={stageRef}
            className="relative mx-auto aspect-square w-full max-w-sm touch-none select-none overflow-hidden rounded-2xl border border-orange-100/80 bg-white shadow-sm"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{ cursor: phase === "ready" ? "grab" : "default" }}
          >
            {phase === "loading" && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                <Loader2 className="animate-spin" size={28} />
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="pointer-events-none absolute inset-0 h-full w-full"
              aria-hidden
            />

            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)",
                backgroundSize: "10% 10%",
              }}
            />
            <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-brand-orange/50" />
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-brand-orange/50" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-orange bg-white/90" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-gray-200"
                onClick={() => nudgeZoom(-ZOOM_STEP * 2)}
                disabled={phase !== "ready" || busy}
                aria-label={de ? "Verkleinern" : "تصغير"}
              >
                <Minus size={16} />
              </button>
              <label className="flex-1 text-xs text-gray-600">
                <span className="mb-1 flex justify-between">
                  <span>{de ? "Zoom" : "تكبير"}</span>
                  <span className="tabular-nums text-gray-400">{Math.round(zoom * 100)}%</span>
                </span>
                <input
                  type="range"
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={ZOOM_STEP}
                  value={zoom}
                  disabled={phase !== "ready" || busy}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </label>
              <button
                type="button"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-gray-200"
                onClick={() => nudgeZoom(ZOOM_STEP * 2)}
                disabled={phase !== "ready" || busy}
                aria-label={de ? "Vergrößern" : "تكبير"}
              >
                <Plus size={16} />
              </button>
              <button
                type="button"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-gray-200"
                onClick={reset}
                disabled={phase !== "ready" || busy}
                title={de ? "Zurücksetzen" : "إعادة ضبط"}
                aria-label={de ? "Zurücksetzen" : "إعادة ضبط"}
              >
                <RotateCcw size={16} />
              </button>
            </div>
            <p className="text-[11px] text-gray-400">
              {de
                ? "Bild ziehen zum Verschieben · Raster zeigt die Mitte"
                : "اسحب الصورة للتحريك · الشبكة تُظهر الوسط"}
            </p>
          </div>

          {(error || phase === "error") && (
            <p className="text-sm text-red-600">{error || (de ? "Fehler" : "خطأ")}</p>
          )}
        </div>

        <div className="flex gap-2 border-t px-4 py-3">
          <button
            type="button"
            className="min-h-11 flex-1 rounded-xl border border-gray-200 px-4 text-sm"
            onClick={onCancel}
            disabled={busy}
          >
            {de ? "Abbrechen" : "إلغاء"}
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-orange px-4 text-sm font-medium text-white disabled:opacity-50"
            onClick={() => void save()}
            disabled={phase !== "ready" || busy}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            {de ? "Übernehmen" : "اعتماد"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
