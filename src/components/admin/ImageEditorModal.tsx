"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  FlipHorizontal,
  FlipVertical,
  Loader2,
  RotateCw,
  Sparkles,
  Undo2,
  Wand2,
  X,
} from "lucide-react";
import { useAdminI18n } from "@/components/admin/AdminI18n";
import CropOverlay from "@/components/admin/image-editor/CropOverlay";
import { Button } from "@/components/ui";
import { suggestEnhance } from "@/lib/image-editor/auto-enhance";
import { estimateExportBytes } from "@/lib/image-editor/export-size";
import { PRODUCT_FILL } from "@/lib/image-editor/product-bounds";
import { consistencyVerdict, meanLuminance, smartBounds, suggestTemperature } from "@/lib/image-editor/studio";
import { PRESET_LABELS, copyFor, type EditorCopy } from "@/lib/image-editor/copy";
import {
  fitCrop,
  normRatioFor,
  orientedAspect,
  pixelAspectFor,
} from "@/lib/image-editor/geometry";
import { adjustmentsEqual, PRESET_ORDER, PRESETS } from "@/lib/image-editor/presets";
import {
  removeImageBackground,
  type RemovalProgress,
} from "@/lib/image-editor/remove-background";
import {
  bitmapFromBlob,
  blitCanvas,
  exportProductImage,
  loadSourceBlob,
  renderFilteredCanvas,
  renderSquareCanvas,
} from "@/lib/image-editor/render";
import {
  DEFAULT_ADJUSTMENTS,
  DEFAULT_EXPORT_QUALITY,
  FULL_FRAME,
  MIN_SOURCE_EDGE,
  clampExportQuality,
  resolveExportEdge,
  type Adjustments,
  type BackgroundMode,
  type CropAspectId,
  type HealSpot,
  type NormRect,
  type PresetId,
  type QuarterTurn,
  type RenderSettings,
  type ShadowMode,
  type StudioBackground,
  type UpscaleTarget,
} from "@/lib/image-editor/types";

type TabId = "ai" | "adjust" | "crop" | "studio";
type Busy = "bg" | "save" | null;

const CHECKER: CSSProperties = {
  backgroundColor: "#f8fafc",
  backgroundImage:
    "linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
};

const PREVIEW_EDGE = 900;

function SliderField({
  label,
  value,
  min,
  max,
  disabled,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-xs text-gray-600">
      <span className="flex items-center justify-between gap-2">
        <span>{label}</span>
        <span className="tabular-nums text-gray-400">
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 w-full accent-orange-500"
      />
    </label>
  );
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function rotateQuarter(current: QuarterTurn): QuarterTurn {
  return ((current + 90) % 360) as QuarterTurn;
}

export default function ImageEditorModal({
  source,
  step,
  onComplete,
  onCancel,
  seed,
  autoExport = false,
  onRemember,
}: {
  source: File | string;
  step?: { current: number; total: number };
  onComplete: (file: File) => void;
  onCancel: () => void;
  seed?: RenderSettings | null;
  autoExport?: boolean;
  onRemember?: (settings: RenderSettings) => void;
}) {
  const { lang } = useAdminI18n();
  const copy = copyFor(lang);
  const presetLabels = PRESET_LABELS[lang];

  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabId>("adjust");
  const [busy, setBusy] = useState<Busy>(null);
  const [progress, setProgress] = useState<RemovalProgress | null>(null);
  const [bgRemoved, setBgRemoved] = useState(false);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [adjustments, setAdjustments] = useState<Adjustments>(DEFAULT_ADJUSTMENTS);
  const [rotation, setRotation] = useState<QuarterTurn>(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [crop, setCrop] = useState<NormRect>(FULL_FRAME);
  const [aspectId, setAspectId] = useState<CropAspectId>("original");
  const [background, setBackground] = useState<BackgroundMode>("white");
  const [zoom, setZoom] = useState(1);
  const [straighten, setStraighten] = useState(0);
  const [shadow, setShadow] = useState<ShadowMode>("none");
  const [backgroundColor, setBackgroundColor] = useState("#f8f9fa");
  const [watermark, setWatermark] = useState(false);
  const [studio, setStudio] = useState<StudioBackground>("none");
  const [margin, setMargin] = useState(true);
  const [heal, setHeal] = useState<HealSpot[]>([]);
  const [healOn, setHealOn] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [bulkApply, setBulkApply] = useState(false);
  const [consistency, setConsistency] = useState("");
  const [filterTick, setFilterTick] = useState(0);
  const [lowRes, setLowRes] = useState<"pending" | "ask" | "ok">("pending");
  const [exportQuality, setExportQuality] = useState(DEFAULT_EXPORT_QUALITY);
  const [upscale, setUpscale] = useState<UpscaleTarget>(0);
  const [sizeBytes, setSizeBytes] = useState<number | null>(null);

  const bitmapRef = useRef<ImageBitmap | null>(null);
  const undoRef = useRef<() => void>(() => {});
  const redoRef = useRef<() => void>(() => {});
  const histRef = useRef<RenderSettings[]>([]);
  const histIndex = useRef(-1);
  const applyingHist = useRef(false);
  const originalBlobRef = useRef<Blob | null>(null);
  const filteredRef = useRef<HTMLCanvasElement | null>(null);
  const squareRef = useRef<HTMLCanvasElement>(null);
  const cropViewRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);

  const replaceBitmap = (next: ImageBitmap | null) => {
    const prev = bitmapRef.current;
    bitmapRef.current = next;
    if (prev && prev !== next) {
      try {
        prev.close();
      } catch {
        /* already closed */
      }
    }
    setBitmap(next);
  };

  useEffect(() => {
    return () => {
      try {
        bitmapRef.current?.close();
      } catch {
        /* already closed */
      }
      bitmapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
      const meta = event.metaKey || event.ctrlKey;
      if (!meta) return;
      const key = event.key.toLowerCase();
      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) redoRef.current();
        else undoRef.current();
      } else if (key === "y") {
        event.preventDefault();
        redoRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  useEffect(() => {
    let cancelled = false;
    setPhase("loading");
    setError("");
    setBgRemoved(false);
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setCrop(FULL_FRAME);
    setAspectId("original");
    setBackground("white");
    setTab("adjust");
    setLowRes("pending");
    setMargin(true);
    setExportQuality(DEFAULT_EXPORT_QUALITY);
    setUpscale(0);
    setSizeBytes(null);

    void (async () => {
      try {
        const blob = await loadSourceBlob(source);
        if (cancelled) return;
        originalBlobRef.current = blob;
        const next = await bitmapFromBlob(blob);
        if (cancelled) {
          next.close();
          return;
        }
        replaceBitmap(next);
        if (seed) {
          if (seed.adjustments) {
            setAdjustments({ ...DEFAULT_ADJUSTMENTS, ...seed.adjustments });
          }
          setExportQuality(clampExportQuality(seed.exportQuality));
          setUpscale(seed.upscale === 1500 || seed.upscale === 2000 ? seed.upscale : 0);
          setRotation(seed.rotation);
          setFlipH(seed.flipH);
          setFlipV(seed.flipV);
          setCrop(seed.crop);
          setBackground(seed.background);
          setStraighten(seed.straighten ?? 0);
          setShadow(seed.shadow ?? "none");
          setBackgroundColor(seed.backgroundColor ?? "#f8f9fa");
          setWatermark(Boolean(seed.watermark));
          setStudio(seed.studio ?? "none");
          setMargin(seed.margin !== false);
          setHeal(seed.heal ?? []);
        } else {
          setAspectId("square");
          setMargin(true);
          setBackground("white");
          try {
            const preview = renderFilteredCanvas(
              next,
              {
                adjustments: DEFAULT_ADJUSTMENTS,
                rotation: 0,
                flipH: false,
                flipV: false,
              },
              Math.min(1600, Math.max(next.width, next.height))
            );
            const ctx = preview.getContext("2d", { willReadFrequently: true });
            if (ctx) {
              const pixels = ctx.getImageData(0, 0, preview.width, preview.height);
              const bounds = smartBounds(pixels.data, preview.width, preview.height, 0);
              if (bounds) setCrop(bounds);
            }
          } catch {
            /* full frame stays */
          }
        }
        setLowRes(Math.min(next.width, next.height) < MIN_SOURCE_EDGE ? "ask" : "ok");
        setPhase("ready");
      } catch {
        if (!cancelled) {
          setError(copy.loadError);
          setPhase("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [source, copy.loadError, seed]);

  const activeAdjustments = comparing ? DEFAULT_ADJUSTMENTS : adjustments;
  const squareSettings = {
    crop,
    background: comparing ? ("white" as const) : background,
    shadow: comparing ? ("none" as const) : shadow,
    backgroundColor,
    watermark: comparing ? false : watermark,
    studio: comparing ? ("none" as const) : studio,
    margin,
  };

  useEffect(() => {
    if (!bitmap) return;
    const filtered = renderFilteredCanvas(
      bitmap,
      {
        adjustments: activeAdjustments,
        rotation,
        flipH,
        flipV,
        straighten: comparing ? 0 : straighten,
        heal: comparing ? [] : heal,
        crop,
        background,
      },
      PREVIEW_EDGE
    );
    filteredRef.current = filtered;
    const ctx = filtered.getContext("2d", { willReadFrequently: true });
    if (ctx && !comparing) {
      const sample = ctx.getImageData(0, 0, filtered.width, filtered.height);
      const score = consistencyVerdict(meanLuminance(sample.data), straighten);
      setConsistency(lang === "ar" ? score.labelAr : score.labelDe);
    }
    setFilterTick((tick) => tick + 1);
  }, [bitmap, activeAdjustments, rotation, flipH, flipV, straighten, heal, comparing, lang]);

  useEffect(() => {
    const filtered = filteredRef.current;
    const square = squareRef.current;
    const cropView = cropViewRef.current;
    const mini = miniRef.current;
    if (!filtered || !square || !cropView || !mini) return;
    blitCanvas(square, renderSquareCanvas(filtered, squareSettings, 720));
    blitCanvas(cropView, filtered);
    blitCanvas(mini, renderSquareCanvas(filtered, squareSettings, 144));
    // squareSettings is rebuilt each render; the listed fields are the real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterTick, crop, background, shadow, backgroundColor, watermark, studio, margin, comparing]);

  useEffect(() => {
    if (phase !== "ready" || !bitmap) return;
    const canvas = squareRef.current;
    if (!canvas || canvas.width < 2) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const png = background === "transparent";
      canvas.toBlob(
        (blob) => {
          if (cancelled || !blob) return;
          const edge = resolveExportEdge(Math.max(bitmap.width, bitmap.height), upscale);
          setSizeBytes(
            estimateExportBytes(blob.size, canvas.width, edge, png ? 0.95 : 0.72)
          );
        },
        png ? "image/png" : "image/webp",
        exportQuality / 100
      );
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [phase, bitmap, exportQuality, upscale, background, filterTick]);

  const imageAspect = bitmap ? orientedAspect(bitmap.width, bitmap.height, rotation) : 1;
  const lockedPixel = pixelAspectFor(aspectId, imageAspect);
  const normRatio = normRatioFor(lockedPixel, imageAspect);

  const applyAspect = (id: CropAspectId) => {
    setAspectId(id);
    if (!bitmap || id === "free") return;
    const aspect = orientedAspect(bitmap.width, bitmap.height, rotation);
    setCrop(fitCrop(aspect, pixelAspectFor(id, aspect)));
  };

  const setSlider = (key: keyof Adjustments, value: number) => {
    setAdjustments((current) => ({ ...current, [key]: value }));
  };

  const onRotate = () => {
    const next = rotateQuarter(rotation);
    setRotation(next);
    if (!bitmap || aspectId === "free") return;
    const aspect = orientedAspect(bitmap.width, bitmap.height, next);
    setCrop(fitCrop(aspect, pixelAspectFor(aspectId, aspect)));
  };

  const onAutoEnhance = () => {
    if (!bitmap) return;
    const neutral = renderFilteredCanvas(
      bitmap,
      { adjustments: DEFAULT_ADJUSTMENTS, rotation, flipH, flipV },
      480
    );
    const ctx = neutral.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const pixels = ctx.getImageData(0, 0, neutral.width, neutral.height);
    setAdjustments(suggestEnhance(pixels.data));
    setTab("adjust");
  };

  const onRemoveBackground = async () => {
    const blob = originalBlobRef.current;
    if (!blob || busy) return;
    setBusy("bg");
    setError("");
    setProgress({ phase: "download", ratio: 0, label: copy.loading });
    try {
      const result = await removeImageBackground(blob, setProgress);
      const next = await bitmapFromBlob(result);
      replaceBitmap(next);
      setBgRemoved(true);
      setBackground("transparent");
      setTab("ai");
    } catch (cause) {
      console.error(cause);
      setError(copy.bgError);
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  const onRestoreBackground = async () => {
    const blob = originalBlobRef.current;
    if (!blob || busy) return;
    try {
      const next = await bitmapFromBlob(blob);
      replaceBitmap(next);
      setBgRemoved(false);
      setBackground("white");
    } catch {
      setError(copy.loadError);
    }
  };

  const applySettings = (settings: RenderSettings) => {
    applyingHist.current = true;
    setAdjustments({ ...DEFAULT_ADJUSTMENTS, ...settings.adjustments });
    setExportQuality(clampExportQuality(settings.exportQuality));
    setUpscale(settings.upscale === 1500 || settings.upscale === 2000 ? settings.upscale : 0);
    setRotation(settings.rotation);
    setFlipH(settings.flipH);
    setFlipV(settings.flipV);
    setCrop(settings.crop);
    setBackground(settings.background);
    setStraighten(settings.straighten ?? 0);
    setShadow(settings.shadow ?? "none");
    setBackgroundColor(settings.backgroundColor ?? "#f8f9fa");
    setWatermark(Boolean(settings.watermark));
    setStudio(settings.studio ?? "none");
    setMargin(settings.margin !== false);
    setHeal(settings.heal ?? []);
  };

  const currentSettings = (): RenderSettings => ({
    adjustments,
    rotation,
    flipH,
    flipV,
    crop,
    background,
    straighten,
    shadow,
    backgroundColor,
    watermark,
    studio,
    margin,
    heal,
    exportQuality,
    upscale,
  });

  useEffect(() => {
    if (phase !== "ready") return;
    if (applyingHist.current) {
      applyingHist.current = false;
      return;
    }
    const snap = currentSettings();
    const prev = histRef.current[histIndex.current];
    if (prev && JSON.stringify(prev) === JSON.stringify(snap)) return;
    histRef.current = histRef.current.slice(0, histIndex.current + 1);
    histRef.current.push(snap);
    if (histRef.current.length > 40) histRef.current.shift();
    histIndex.current = histRef.current.length - 1;
  });

  undoRef.current = () => {
    if (histIndex.current <= 0) return;
    histIndex.current -= 1;
    applySettings(histRef.current[histIndex.current]);
  };
  redoRef.current = () => {
    if (histIndex.current >= histRef.current.length - 1) return;
    histIndex.current += 1;
    applySettings(histRef.current[histIndex.current]);
  };

  const onSave = async () => {
    if (!bitmap || busy) return;
    setBusy("save");
    setError("");
    try {
      const settings = currentSettings();
      if (bulkApply) onRemember?.(settings);
      let file = await exportProductImage(bitmap, settings);
      try {
        const body = new FormData();
        body.append("file", file);
        const framed = await fetch("/api/admin/frame-product-image", { method: "POST", body });
        if (framed.ok && framed.headers.get("X-Frame-Changed") === "1") {
          const blob = await framed.blob();
          file = new File([blob], "product.webp", { type: "image/webp" });
        }
      } catch {
        /* keep the editor file when the trim service is unreachable */
      }
      try {
        sessionStorage.setItem("jmle-editor-peer-luma", consistency);
      } catch {
        /* private mode */
      }
      onComplete(file);
    } catch (cause) {
      console.error(cause);
      setError(cause instanceof Error ? cause.message : copy.bgError);
      setBusy(null);
    }
  };

  const autoOnce = useRef(false);
  useEffect(() => {
    if (phase !== "ready" || lowRes !== "ok" || !autoExport || autoOnce.current || busy) return;
    autoOnce.current = true;
    void onSave();
  }, [phase, autoExport, busy, lowRes]);

  const onWhiteBalance = () => {
    if (!bitmap) return;
    const neutral = renderFilteredCanvas(
      bitmap,
      { adjustments: DEFAULT_ADJUSTMENTS, rotation, flipH, flipV, crop, background },
      480
    );
    const ctx = neutral.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const pixels = ctx.getImageData(0, 0, neutral.width, neutral.height);
    setAdjustments((current) => ({
      ...current,
      temperature: suggestTemperature(pixels.data),
    }));
  };

  const onSmartCrop = () => {
    const filtered = filteredRef.current;
    if (!filtered) return;
    const ctx = filtered.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const pixels = ctx.getImageData(0, 0, filtered.width, filtered.height);
    const rect = smartBounds(pixels.data, filtered.width, filtered.height);
    if (!rect) return;
    setAspectId("free");
    setCrop(rect);
  };

  const resetOriginal = () => {
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setCrop(FULL_FRAME);
    setAspectId("original");
    setStraighten(0);
    setShadow("none");
    setWatermark(false);
    setStudio("none");
    setHeal([]);
    setBackground("white");
    setExportQuality(DEFAULT_EXPORT_QUALITY);
    setUpscale(0);
    void onRestoreBackground();
  };

  const activePreset = PRESET_ORDER.find((id) =>
    adjustmentsEqual(adjustments, PRESETS[id])
  );

  const title =
    step && step.total > 1
      ? `${copy.title} · ${copy.step} ${step.current}/${step.total}`
      : copy.title;

  const exportEdge = bitmap
    ? resolveExportEdge(Math.max(bitmap.width, bitmap.height), upscale)
    : upscale || 2000;

  const modal = (
    <div
      className="fixed inset-0 z-[400] flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <div className="relative flex h-[100dvh] max-h-[92vh] w-full max-w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-w-5xl sm:rounded-2xl">
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            <p className="text-[11px] text-gray-500">
              {copy.outputHint} · {exportEdge}×{exportEdge} · {exportQuality}% ·{" "}
              {sizeBytes ? formatBytes(sizeBytes) : "…"} ·{" "}
              {background === "transparent" ? "PNG" : "WebP"}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-2 hover:bg-gray-100"
            aria-label={copy.close}
            disabled={busy === "save"}
          >
            <X size={18} />
          </button>
        </header>

        <div className="grid min-h-0 min-w-0 flex-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_340px]">
          <div
            className="relative flex min-h-0 min-w-0 max-h-[70vh] items-center justify-center overflow-hidden p-4"
            style={CHECKER}
          >
            {phase === "loading" && (
              <p className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="animate-spin" size={16} />
                {copy.loading}
              </p>
            )}
            <canvas
              ref={squareRef}
              onClick={(event) => {
                if (!healOn || !squareRef.current) return;
                const bounds = squareRef.current.getBoundingClientRect();
                const px = ((event.clientX - bounds.left) / bounds.width) * squareRef.current.width;
                const py = ((event.clientY - bounds.top) / bounds.height) * squareRef.current.height;
                const inner = margin
                  ? squareRef.current.width * PRODUCT_FILL
                  : squareRef.current.width;
                const origin = (squareRef.current.width - inner) / 2;
                const nx = (px - origin) / inner;
                const ny = (py - origin) / inner;
                if (nx < 0 || ny < 0 || nx > 1 || ny > 1) return;
                setHeal((spots) => [
                  ...spots,
                  { x: crop.x + nx * crop.w, y: crop.y + ny * crop.h, r: 0.03 },
                ]);
              }}
              style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
              className={
                phase === "ready" && tab !== "crop"
                  ? "aspect-square h-auto max-h-[70vh] w-full max-w-full object-contain cursor-crosshair"
                  : "hidden"
              }
            />
            <div
              className={
                phase === "ready" && tab === "crop"
                  ? "relative inline-block max-w-full"
                  : "hidden"
              }
            >
              <canvas
                ref={cropViewRef}
                className="block h-auto max-h-[70vh] w-auto max-w-full object-contain"
              />
              <CropOverlay crop={crop} normRatio={normRatio} onChange={setCrop} />
            </div>
            {busy === "bg" && progress && (
              <div className="absolute inset-x-6 bottom-4 rounded-xl bg-white/95 p-3 shadow">
                <p className="text-xs font-medium text-gray-700">
                  {progress.label} · {Math.round(progress.ratio * 100)} %
                </p>
                <p className="mt-1 text-[11px] text-gray-500">
                  Das Freistell-Modell läuft lokal auf dem Prozessor, ein Bild nach dem anderen.
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-gold transition-all"
                    style={{ width: `${Math.round(progress.ratio * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <aside className="flex max-h-[46vh] flex-col border-t lg:max-h-[70vh] lg:border-l lg:border-t-0">
            <div className="flex gap-1 border-b p-2">
              {(
                [
                  ["ai", copy.tabAi],
                  ["adjust", copy.tabAdjust],
                  ["crop", copy.tabCrop],
                  ["studio", copy.tabStudio],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`min-h-9 flex-1 rounded-lg px-2 text-xs font-medium ${
                    tab === id ? "bg-gold text-white" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              {error && <p className="text-xs text-red-500">{error}</p>}

              {tab === "ai" && (
                <div className="space-y-3">
                  <p className="text-[11px] leading-relaxed text-gray-500">{copy.bgHint}</p>
                  <Button
                    type="button"
                    size="sm"
                    fullWidth
                    disabled={phase !== "ready" || busy !== null}
                    leadingIcon={
                      busy === "bg" ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : (
                        <Sparkles size={14} />
                      )
                    }
                    onClick={() => void onRemoveBackground()}
                  >
                    {copy.removeBg}
                  </Button>
                  {bgRemoved && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      fullWidth
                      disabled={busy !== null}
                      leadingIcon={<Undo2 size={14} />}
                      onClick={() => void onRestoreBackground()}
                    >
                      {copy.restoreBg}
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="soft"
                    fullWidth
                    disabled={phase !== "ready" || busy !== null}
                    leadingIcon={<Wand2 size={14} />}
                    onClick={onAutoEnhance}
                  >
                    {copy.autoEnhance}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" fullWidth disabled={phase !== "ready"} onClick={onWhiteBalance}>
                    {copy.whiteBalance}
                  </Button>
                  <SliderField
                    label={copy.threshold}
                    min={0}
                    max={100}
                    value={adjustments.alphaThreshold}
                    disabled={phase !== "ready"}
                    onChange={(value) => setSlider("alphaThreshold", value)}
                  />
                  <SliderField
                    label={copy.symmetry}
                    min={0}
                    max={100}
                    value={adjustments.symmetry}
                    disabled={phase !== "ready"}
                    onChange={(value) => setSlider("symmetry", value)}
                  />
                  <BackgroundToggle
                    copy={copy}
                    value={background}
                    disabled={phase !== "ready"}
                    onChange={setBackground}
                  />
                </div>
              )}

              {tab === "adjust" && (
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-xs font-medium text-gray-700">{copy.presets}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_ORDER.map((id) => (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={activePreset === id}
                          disabled={phase !== "ready"}
                          onClick={() => setAdjustments({ ...PRESETS[id] })}
                          className={`rounded-full border px-2.5 py-1 text-[11px] ${
                            activePreset === id
                              ? "border-gold bg-gold text-white"
                              : "border-gray-200 bg-white text-gray-700 hover:border-gold/50"
                          }`}
                        >
                          {presetLabels[id]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <AdjustmentGroup
                    title={copy.lightLabel}
                    disabled={phase !== "ready"}
                    fields={[
                      ["brightness", copy.brightness, -100, 100],
                      ["contrast", copy.contrast, -100, 100],
                      ["highlights", copy.highlights, -100, 100],
                      ["shadows", copy.shadows, -100, 100],
                      ["whites", copy.whites, -100, 100],
                      ["blacks", copy.blacks, -100, 100],
                    ]}
                    adjustments={adjustments}
                    onChange={setSlider}
                  />
                  <AdjustmentGroup
                    title={copy.colorLabel}
                    disabled={phase !== "ready"}
                    fields={[
                      ["hue", copy.hue, -180, 180],
                      ["temperature", copy.temperature, -100, 100],
                      ["vibrance", copy.vibrance, -100, 100],
                      ["saturation", copy.saturation, -100, 100],
                    ]}
                    adjustments={adjustments}
                    onChange={setSlider}
                  />
                  <AdjustmentGroup
                    title={copy.qualityLabel}
                    disabled={phase !== "ready"}
                    fields={[
                      ["sharpness", copy.sharpness, 0, 100],
                      ["clarity", copy.clarity, 0, 100],
                      ["noiseReduction", copy.noiseReduction, 0, 100],
                    ]}
                    adjustments={adjustments}
                    onChange={setSlider}
                  />
                  <fieldset className="space-y-2">
                    <legend className="mb-1 text-xs font-medium text-gray-700">
                      {copy.exportQuality}
                    </legend>
                    <SliderField
                      label={copy.exportQuality}
                      min={92}
                      max={95}
                      suffix="%"
                      value={exportQuality}
                      disabled={phase !== "ready"}
                      onChange={setExportQuality}
                    />
                    <p className="text-[11px] text-gray-500">{copy.exportQualityHint}</p>
                    <p className="text-[11px] text-gray-700">
                      {copy.fileSize}: {sizeBytes ? formatBytes(sizeBytes) : "…"} · {exportEdge}×
                      {exportEdge} · {exportQuality}%
                    </p>
                    <p className="text-xs font-medium text-gray-700">{copy.upscaleLabel}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          [0, copy.upscaleOff],
                          [1500, copy.upscale1500],
                          [2000, copy.upscale2000],
                        ] as const
                      ).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={upscale === id}
                          disabled={phase !== "ready"}
                          onClick={() => setUpscale(id)}
                          className={`rounded-full border px-2.5 py-1 text-[11px] ${
                            upscale === id
                              ? "border-gold bg-gold text-white"
                              : "border-gray-200 bg-white text-gray-700"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={phase !== "ready"}
                    onClick={() => setAdjustments(DEFAULT_ADJUSTMENTS)}
                  >
                    {copy.resetAdjustments}
                  </Button>
                </div>
              )}

              {tab === "crop" && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ["free", copy.cropFree],
                        ["square", copy.cropSquare],
                        ["wide", copy.cropWide],
                        ["classic", copy.cropClassic],
                        ["original", copy.cropOriginal],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={aspectId === id}
                        disabled={phase !== "ready"}
                        onClick={() => applyAspect(id)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] ${
                          aspectId === id
                            ? "border-gold bg-gold text-white"
                            : "border-gray-200 bg-white text-gray-700"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <BackgroundToggle
                    copy={copy}
                    value={background}
                    disabled={phase !== "ready"}
                    onChange={setBackground}
                  />
                  <Button type="button" size="sm" variant="ghost" fullWidth disabled={phase !== "ready"} onClick={onSmartCrop}>
                    {copy.smartCrop}
                  </Button>
                  <SliderField
                    label={copy.straighten}
                    min={-45}
                    max={45}
                    value={straighten}
                    disabled={phase !== "ready"}
                    onChange={setStraighten}
                  />
                </div>
              )}

              {tab === "studio" && (
                <div className="space-y-3">
                  <p className={`text-xs ${consistency.includes("passen") || consistency.includes("مناسب") ? "text-emerald-700" : "text-amber-700"}`}>
                    {consistency || "…"}
                  </p>
                  <SliderField label={copy.zoom} min={1} max={3} value={zoom} disabled={phase !== "ready"} onChange={setZoom} />
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ["none", "—"],
                        ["neutral", copy.studioNeutral],
                        ["marble", copy.studioMarble],
                        ["wood", copy.studioWood],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={studio === id}
                        onClick={() => setStudio(id)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] ${studio === id ? "border-gold bg-gold text-white" : "border-gray-200"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <label className="flex items-center justify-between gap-2 text-xs">
                    {copy.brandColor}
                    <input type="color" value={backgroundColor} onChange={(event) => { setBackgroundColor(event.target.value); setBackground("color"); setStudio("none"); }} />
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ["none", "—"],
                        ["drop", copy.shadowDrop],
                        ["contact", copy.shadowContact],
                        ["both", "Beide"],
                      ] as const
                    ).map(([id, label]) => (
                      <button key={id} type="button" aria-pressed={shadow === id} onClick={() => setShadow(id)} className={`rounded-full border px-2.5 py-1 text-[11px] ${shadow === id ? "border-gold bg-gold text-white" : "border-gray-200"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <SliderField label={copy.specular} min={0} max={100} value={adjustments.specular} disabled={phase !== "ready"} onChange={(value) => setSlider("specular", value)} />
                  <SliderField label={copy.deflare} min={0} max={100} value={adjustments.deflare} disabled={phase !== "ready"} onChange={(value) => setSlider("deflare", value)} />
                  <SliderField label={copy.labelSharp} min={0} max={100} value={adjustments.labelSharpness} disabled={phase !== "ready"} onChange={(value) => setSlider("labelSharpness", value)} />
                  <SliderField label={copy.foodBoost} min={0} max={100} value={adjustments.foodBoost} disabled={phase !== "ready"} onChange={(value) => setSlider("foodBoost", value)} />
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={watermark} onChange={(event) => setWatermark(event.target.checked)} />
                    {copy.watermark}
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={margin} onChange={(event) => setMargin(event.target.checked)} />
                    {copy.margin}
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={healOn} onChange={(event) => setHealOn(event.target.checked)} />
                    {copy.heal}
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={bulkApply} onChange={(event) => setBulkApply(event.target.checked)} />
                    {copy.bulkApply}
                  </label>
                  <Button type="button" size="sm" variant="ghost" fullWidth onClick={resetOriginal}>
                    {copy.resetOriginal}
                  </Button>
                </div>
              )}
            </div>
          </aside>
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t px-4 py-3">
          <canvas
            ref={miniRef}
            className="h-12 w-12 rounded-md border border-gray-200"
            style={CHECKER}
            aria-hidden
          />
          <div className="flex flex-1 flex-wrap gap-1">
            <IconAction label={copy.undo} disabled={phase !== "ready" || busy !== null} onClick={() => undoRef.current()}>
              <Undo2 size={16} />
            </IconAction>
            <IconAction label={copy.redo} disabled={phase !== "ready" || busy !== null} onClick={() => redoRef.current()}>
              <RotateCw size={16} className="scale-x-[-1]" />
            </IconAction>
            <button
              type="button"
              title={copy.compare}
              aria-label={copy.compare}
              disabled={phase !== "ready"}
              onPointerDown={() => setComparing(true)}
              onPointerUp={() => setComparing(false)}
              onPointerLeave={() => setComparing(false)}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 px-2 text-[10px] font-semibold text-gray-700"
            >
              {comparing ? "Nachher" : "Vorher"}
            </button>
            <IconAction
              label={copy.flipH}
              disabled={phase !== "ready" || busy !== null}
              onClick={() => setFlipH((value) => !value)}
            >
              <FlipHorizontal size={16} />
            </IconAction>
            <IconAction
              label={copy.flipV}
              disabled={phase !== "ready" || busy !== null}
              onClick={() => setFlipV((value) => !value)}
            >
              <FlipVertical size={16} />
            </IconAction>
            <IconAction
              label={copy.rotate}
              disabled={phase !== "ready" || busy !== null}
              onClick={onRotate}
            >
              <RotateCw size={16} />
            </IconAction>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={busy === "save"}>
            {copy.cancel}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={phase !== "ready" || busy !== null || lowRes === "ask"}
            leadingIcon={
              busy === "save" ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />
            }
            onClick={() => void onSave()}
          >
            {busy === "save" ? copy.applying : copy.apply}
          </Button>
        </footer>
        {lowRes === "ask" && (
          <div className="absolute inset-0 z-30 flex items-center justify-center overflow-hidden bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
              <p className="text-sm font-semibold text-gray-900">{copy.lowResTitle}</p>
              <p className="mt-2 text-xs leading-relaxed text-gray-600">{copy.lowResBody}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => setLowRes("ok")}>
                  {copy.lowResContinue}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
                  {copy.lowResCancel}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

function BackgroundToggle({
  copy,
  value,
  disabled,
  onChange,
}: {
  copy: EditorCopy;
  value: BackgroundMode;
  disabled?: boolean;
  onChange: (value: BackgroundMode) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-gray-700">{copy.bgLabel}</p>
      <div className="grid grid-cols-2 gap-1.5">
        {(
          [
            ["white", copy.bgWhite],
            ["transparent", copy.bgTransparent],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            disabled={disabled}
            aria-pressed={value === id}
            onClick={() => onChange(id)}
            className={`rounded-lg border px-2 py-2 text-xs ${
              value === id ? "border-gold bg-orange-50 text-gold-dark" : "border-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function AdjustmentGroup({
  title,
  fields,
  adjustments,
  disabled,
  onChange,
}: {
  title: string;
  fields: [keyof Adjustments, string, number, number][];
  adjustments: Adjustments;
  disabled?: boolean;
  onChange: (key: keyof Adjustments, value: number) => void;
}) {
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="mb-1 text-xs font-medium text-gray-700">{title}</legend>
      {fields.map(([key, label, min, max]) => (
        <SliderField
          key={key}
          label={label}
          min={min}
          max={max}
          value={adjustments[key]}
          disabled={disabled}
          onChange={(value) => onChange(key, value)}
        />
      ))}
    </fieldset>
  );
}

function IconAction({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:border-gold/40 hover:text-gold disabled:opacity-40"
    >
      {children}
    </button>
  );
}
