"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Upload, X, Star, Pencil, Download, Loader2, Sparkles } from "lucide-react";
import { uploadProductImage } from "@/lib/compress-image";
import { useAdminI18n } from "@/components/admin/AdminI18n";
import { copyFor } from "@/lib/image-editor/copy";
import {
  autoProcessProductFile,
  type AutoProcessProgress,
} from "@/lib/image-editor/auto-process-upload";
import { preloadBackgroundRemoval } from "@/lib/image-editor/remove-background";
import type { RenderSettings } from "@/lib/image-editor/types";

const ImageEditorModal = dynamic(() => import("@/components/admin/ImageEditorModal"), {
  ssr: false,
});

type EditorSession = {
  key: string;
  source: File | string;
  replaceUrl?: string;
  step?: { current: number; total: number };
};

function fileKey(file: File, index: number) {
  return `${index}-${file.name}-${file.size}-${file.lastModified}`;
}

async function downloadImageUrl(url: string, filename = "bild") {
  const guessExt = (type: string) =>
    type.includes("png")
      ? "png"
      : type.includes("webp")
        ? "webp"
        : type.includes("jpeg") || type.includes("jpg")
          ? "jpg"
          : "png";

  const saveBlob = async (blob: Blob) => {
    const ext = guessExt(blob.type || "");
    const safeName = `${filename}.${ext}`;
    const file = new File([blob], safeName, {
      type: blob.type || `image/${ext}`,
    });

    // iOS/Android: Web Share speichert oft direkt in Fotos/Album
    const nav = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean;
      share?: (data: ShareData) => Promise<void>;
    };
    if (typeof nav.canShare === "function" && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], title: safeName });
      return;
    }

    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = safeName;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2500);
  };

  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit", cache: "no-store" });
    if (!res.ok) throw new Error("download failed");
    await saveBlob(await res.blob());
  } catch {
    try {
      // Same-origin / blob URLs: XHR as second path (better than Safari tab)
      const blob = await new Promise<Blob>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.responseType = "blob";
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300 && xhr.response) {
            resolve(xhr.response as Blob);
          } else reject(new Error("xhr failed"));
        };
        xhr.onerror = () => reject(new Error("xhr failed"));
        xhr.send();
      });
      await saveBlob(blob);
    } catch {
      // Letzter Fallback: verstecktes iframe, kein neuer Tab
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);
      window.setTimeout(() => iframe.remove(), 4000);
    }
  }
}

export default function ImageUpload({
  value,
  onChange,
  folder = "products",
  multiple = false,
  enableCrop = false,
  enableEditor = false,
  label,
}: {
  value: string | string[];
  onChange: (urls: string | string[]) => void;
  folder?: string;
  multiple?: boolean;
  /** Öffnet den Bildeditor (Freisteller, Filter, Zuschnitt) vor dem Upload. */
  enableEditor?: boolean;
  /** @deprecated Alias für enableEditor */
  enableCrop?: boolean;
  /** Optionaler UI-Label (sonst t("images")) */
  label?: string;
}) {
  const { lang, t } = useAdminI18n();
  const copy = copyFor(lang);
  const fieldLabel = label || t("images");
  const editorEnabled = enableEditor || enableCrop;
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [pasteHint, setPasteHint] = useState(false);
  const [turboProgress, setTurboProgress] = useState<AutoProcessProgress | null>(null);
  const [session, setSession] = useState<EditorSession | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorEnabled) void preloadBackgroundRemoval();
  }, [editorEnabled]);
  const urls = Array.isArray(value) ? value : value ? [value] : [];
  const urlsKey = urls.join("\n");
  const urlsKeyRef = useRef(urlsKey);
  const urlsRef = useRef(urls);
  if (urlsKeyRef.current !== urlsKey) {
    urlsKeyRef.current = urlsKey;
    urlsRef.current = urls;
  }
  const batchRef = useRef<File[] | null>(null);
  const batchIndexRef = useRef(0);
  const bulkRef = useRef<RenderSettings | null>(null);

  const publish = (next: string[]) => {
    urlsRef.current = next;
    onChange(multiple ? next : (next[0] ?? ""));
  };

  const uploadOne = async (file: File) => uploadProductImage(file, folder);

  const openBatch = (files: File[], index: number) => {
    batchRef.current = files;
    batchIndexRef.current = index;
    const file = files[index];
    if (!file) return;
    setSession({
      key: fileKey(file, index),
      source: file,
      step: files.length > 1 ? { current: index + 1, total: files.length } : undefined,
    });
  };

  const handleFiles = async (files: FileList | File[]) => {
    setError("");
    const list = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (!list.length) return;

    // Zero-Click: Freisteller + Zentrierung automatisch, kein manueller Zuschnitt
    if (editorEnabled) {
      setUploading(true);
      setTurboProgress({
        phase: "process",
        ratio: 0.02,
        label: "⚡ Entferne Hintergrund mit KI (Turbo-Modus)…",
        total: list.length,
        index: 1,
      });
      try {
        const uploaded: string[] = [];
        for (let i = 0; i < list.length; i++) {
          const file = list[i];
          const processed = await autoProcessProductFile(file, (p) =>
            setTurboProgress({ ...p, index: i + 1, total: list.length, fileName: file.name })
          );
          uploaded.push(await uploadProductImage(processed, folder, { alreadyEncoded: true }));
        }
        if (multiple) publish([...urlsRef.current, ...uploaded]);
        else publish(uploaded[0] ? [uploaded[0]] : []);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Auto-Optimierung fehlgeschlagen"
        );
      } finally {
        setUploading(false);
        setTurboProgress(null);
      }
      return;
    }

    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of list) {
        uploaded.push(await uploadOne(file));
      }
      if (multiple) publish([...urlsRef.current, ...uploaded]);
      else publish(uploaded[0] ? [uploaded[0]] : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  };

  const onPaste = useCallback(
    (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items?.length) return;
      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (!files.length) return;
      event.preventDefault();
      setPasteHint(true);
      window.setTimeout(() => setPasteHint(false), 1200);
      void handleFiles(files);
    },
    // handleFiles closes over latest editor/upload state via refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editorEnabled, folder, multiple]
  );

  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const listener = (e: ClipboardEvent) => onPaste(e);
    el.addEventListener("paste", listener);
    // Auch global, wenn Fokus im Upload-Bereich liegt
    const onDocPaste = (e: ClipboardEvent) => {
      if (!el.contains(document.activeElement) && document.activeElement !== el) {
        // Erlaube Paste, wenn der Bereich fokussiert ist oder nichts anderes fokussiert ist
        const active = document.activeElement;
        const isTyping =
          active instanceof HTMLInputElement ||
          active instanceof HTMLTextAreaElement ||
          (active as HTMLElement | null)?.isContentEditable;
        if (isTyping && active !== el) return;
      }
      if (el.contains(document.activeElement) || document.activeElement === el || el.matches(":focus-within")) {
        onPaste(e);
      }
    };
    document.addEventListener("paste", onDocPaste);
    return () => {
      el.removeEventListener("paste", listener);
      document.removeEventListener("paste", onDocPaste);
    };
  }, [onPaste]);

  const onEditorDone = async (file: File) => {
    const current = session;
    const batch = batchRef.current;
    const index = batchIndexRef.current;
    setSession(null);
    setUploading(true);
    setError("");
    try {
      const url = await uploadProductImage(file, folder, { alreadyEncoded: true });
      const base = urlsRef.current;
      const next = current?.replaceUrl
        ? base.map((item) => (item === current.replaceUrl ? url : item))
        : multiple
          ? [...base, url]
          : [url];
      publish(next);

      if (batch && !current?.replaceUrl && index + 1 < batch.length) {
        openBatch(batch, index + 1);
      } else {
        batchRef.current = null;
      }
    } catch (cause) {
      batchRef.current = null;
      setError(cause instanceof Error ? cause.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  };

  const remove = (url: string) => {
    const next = urls.filter((item) => item !== url);
    publish(next);
  };

  const setCover = (url: string) => {
    if (!multiple) return;
    publish([url, ...urls.filter((item) => item !== url)]);
  };

  const downloadLabel = lang === "de" ? "Bild herunterladen" : "تحميل الصورة";
  const pasteLabel =
    lang === "de"
      ? "Strg+V / Cmd+V zum Einfügen aus der Zwischenablage"
      : "Ctrl+V / Cmd+V للصق من الحافظة";
  const helperText = editorEnabled
    ? lang === "de"
      ? "Zero-Click: Freisteller + Auto-Zentrierung starten sofort bei Upload/Einfügen. Stift = optional nachbearbeiten."
      : "Zero-Click: إزالة الخلفية والمحاذاة تلقائياً عند الرفع/اللصق. القلم = تعديل اختياري."
    : lang === "de"
      ? "Automatische WebP-Kompression. Bei mehreren Bildern: Stern = Hauptbild (Cover)."
      : "ضغط WebP تلقائي. عند عدة صور: النجمة = الصورة الرئيسية.";
  const dropLabel = editorEnabled
    ? lang === "de"
      ? "Bild einfügen — Turbo-Freisteller startet automatisch"
      : "أدرج صورة — يبدأ القص التلقائي فوراً"
    : fieldLabel;

  return (
    <div
      ref={dropRef}
      tabIndex={0}
      className={`space-y-2 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40 ${
        pasteHint ? "ring-2 ring-brand-orange/50" : ""
      }`}
      aria-label={pasteLabel}
    >
      <label className="mb-1 block text-sm">{fieldLabel}</label>
      <p className="mb-2 text-[11px] text-gray-500">
        {helperText} · {pasteLabel}
      </p>
      {turboProgress && (
        <div className="mb-3 rounded-xl border border-orange-200 bg-orange-50/90 px-3 py-3">
          <p className="flex items-center gap-2 text-xs font-semibold text-brand-orange">
            <Loader2 size={14} className="animate-spin" />
            {turboProgress.label}
            {turboProgress.total && turboProgress.total > 1
              ? ` (${turboProgress.index}/${turboProgress.total})`
              : ""}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-orange-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-orange to-gold transition-all duration-200"
              style={{
                width: `${Math.round(Math.max(0.05, turboProgress.ratio) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {urls.map((url, index) => (
          <div
            key={url}
            className={`relative h-24 w-24 overflow-hidden rounded-xl bg-jmle-cream ring-2 ${
              index === 0 ? "ring-gold" : "ring-transparent"
            }`}
          >
            <Image
              src={url}
              alt=""
              fill
              unoptimized
              className="object-contain object-center"
              sizes="96px"
            />
            {editorEnabled && (
              <button
                type="button"
                className="absolute inset-0"
                aria-label={copy.title}
                onClick={() => {
                  if (uploading || session) return;
                  batchRef.current = null;
                  setSession({ key: url, source: url, replaceUrl: url });
                }}
              />
            )}
            {index === 0 && (
              <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-gold px-1.5 py-0.5 text-[9px] font-medium text-white">
                {copy.cover}
              </span>
            )}
            {editorEnabled && (
              <span className="pointer-events-none absolute bottom-1 right-1 rounded-full bg-white/90 p-1 text-gray-700">
                <Pencil size={10} />
              </span>
            )}
            <div className="absolute right-1 top-1 z-10 flex flex-col gap-1">
              <button
                type="button"
                onClick={() => remove(url)}
                className="flex min-h-8 min-w-8 items-center justify-center rounded-full bg-white/90 p-1.5"
                aria-label={copy.remove}
              >
                <X size={12} />
              </button>
              <button
                type="button"
                onClick={() => void downloadImageUrl(url, `jmle-${folder}-${index + 1}`)}
                className="flex min-h-8 min-w-8 items-center justify-center rounded-full bg-white/90 p-1.5 text-brand-orange"
                title={downloadLabel}
                aria-label={downloadLabel}
              >
                <Download size={12} />
              </button>
              {multiple && index !== 0 && (
                <button
                  type="button"
                  onClick={() => setCover(url)}
                  className="flex min-h-8 min-w-8 items-center justify-center rounded-full bg-white/90 p-1.5 text-gold"
                  title={copy.setCover}
                  aria-label={copy.setCover}
                >
                  <Star size={12} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gold/40 py-3 text-sm text-gray-600 hover:bg-jmle-warm">
          {uploading ? (
            <Loader2 size={16} className="animate-spin text-brand-orange" />
          ) : editorEnabled ? (
            <Sparkles size={16} className="text-brand-orange" />
          ) : (
            <Upload size={16} />
          )}
          {uploading ? turboProgress?.label || t("saving") : dropLabel}
          <input
            type="file"
            accept="image/*"
            multiple={multiple}
            className="hidden"
            disabled={uploading || session !== null}
            onChange={(event) => {
              if (event.target.files?.length) void handleFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
        {urls[0] ? (
          <button
            type="button"
            onClick={() => void downloadImageUrl(urls[0], `jmle-${folder}`)}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-orange-200 bg-white px-3 text-sm text-luxury-charcoal hover:border-brand-orange hover:text-brand-orange"
          >
            <Download size={16} />
            {downloadLabel}
          </button>
        ) : null}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}

      {session && (
        <ImageEditorModal
          key={session.key}
          source={session.source}
          step={session.step}
          seed={
            session.replaceUrl
              ? null
              : bulkRef.current
                ? {
                    // Crop/Zentrierung NIEMALS auf andere Bilder übernehmen
                    ...bulkRef.current,
                    crop: { x: 0, y: 0, w: 1, h: 1 },
                  }
                : null
          }
          autoRemoveBackground
          autoExport={false}
          onRemember={(settings) => {
            bulkRef.current = {
              ...settings,
              crop: { x: 0, y: 0, w: 1, h: 1 },
            };
          }}
          onComplete={(file) => void onEditorDone(file)}
          onCancel={() => {
            bulkRef.current = null;
            setSession(null);
            batchRef.current = null;
          }}
        />
      )}
    </div>
  );
}
