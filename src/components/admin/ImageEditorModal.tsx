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
  FULL_FRAME,
  type Adjustments,
  type BackgroundMode,
  type CropAspectId,
  type NormRect,
  type PresetId,
  type QuarterTurn,
} from "@/lib/image-editor/types";

type TabId = "ai" | "adjust" | "crop";
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
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-xs text-gray-600">
      <span className="flex items-center justify-between gap-2">
        <span>{label}</span>
        <span className="tabular-nums text-gray-400">{value}</span>
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

function rotateQuarter(current: QuarterTurn): QuarterTurn {
  return ((current + 90) % 360) as QuarterTurn;
}

export default function ImageEditorModal({
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
  const [filterTick, setFilterTick] = useState(0);

  const bitmapRef = useRef<ImageBitmap | null>(null);
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
  }, [source, copy.loadError]);

  useEffect(() => {
    if (!bitmap) return;
    const filtered = renderFilteredCanvas(
      bitmap,
      { adjustments, rotation, flipH, flipV },
      PREVIEW_EDGE
    );
    filteredRef.current = filtered;
    setFilterTick((tick) => tick + 1);
  }, [bitmap, adjustments, rotation, flipH, flipV]);

  useEffect(() => {
    const filtered = filteredRef.current;
    const square = squareRef.current;
    const cropView = cropViewRef.current;
    const mini = miniRef.current;
    if (!filtered || !square || !cropView || !mini) return;
    blitCanvas(square, renderSquareCanvas(filtered, { crop, background }, 720));
    blitCanvas(cropView, filtered);
    blitCanvas(mini, renderSquareCanvas(filtered, { crop, background }, 144));
  }, [filterTick, crop, background]);

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

  const onSave = async () => {
    if (!bitmap || busy) return;
    setBusy("save");
    setError("");
    try {
      const file = await exportProductImage(bitmap, {
        adjustments,
        rotation,
        flipH,
        flipV,
        crop,
        background,
      });
      onComplete(file);
    } catch (cause) {
      console.error(cause);
      setError(cause instanceof Error ? cause.message : copy.bgError);
      setBusy(null);
    }
  };

  const activePreset = PRESET_ORDER.find((id) =>
    adjustmentsEqual(adjustments, PRESETS[id])
  );

  const title =
    step && step.total > 1
      ? `${copy.title} · ${copy.step} ${step.current}/${step.total}`
      : copy.title;

  const modal = (
    <div
      className="fixed inset-0 z-[400] flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[92vh] sm:max-w-5xl sm:rounded-2xl">
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            <p className="text-[11px] text-gray-500">
              {copy.outputHint} · {background === "transparent" ? "PNG" : "WebP"}
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

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div
            className="relative flex min-h-[240px] items-center justify-center p-4"
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
              className={
                phase === "ready" && tab !== "crop"
                  ? "aspect-square h-auto w-full max-w-[min(100%,640px)]"
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
                className="block h-auto max-h-[52vh] w-auto max-w-full"
              />
              <CropOverlay crop={crop} normRatio={normRatio} onChange={setCrop} />
            </div>
            {busy === "bg" && progress && (
              <div className="absolute inset-x-6 bottom-4 rounded-xl bg-white/95 p-3 shadow">
                <p className="text-xs font-medium text-gray-700">{progress.label}</p>
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
                      ["noiseReduction", copy.noiseReduction, 0, 100],
                    ]}
                    adjustments={adjustments}
                    onChange={setSlider}
                  />
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
            disabled={phase !== "ready" || busy !== null}
            leadingIcon={
              busy === "save" ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />
            }
            onClick={() => void onSave()}
          >
            {busy === "save" ? copy.applying : copy.apply}
          </Button>
        </footer>
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
