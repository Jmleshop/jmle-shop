"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  Monitor,
  Smartphone,
  Tablet,
  Undo2,
  Redo2,
  Upload,
  RotateCcw,
  History,
  Loader2,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { useAdminI18n } from "@/components/admin/AdminI18n";
import {
  LAYOUT_PREVIEW_MESSAGE,
  LAYOUT_PREVIEW_READY,
  VIEWPORT_WIDTHS,
  defaultLayoutDocument,
  documentsEqual,
  normalizeLayoutDocument,
  type LayoutDocument,
  type LayoutSliderStyle,
  type LayoutViewport,
  type LayoutVersionEntry,
} from "@/lib/layout-builder";
import { cn } from "@/lib/cn";

const HISTORY_LIMIT = 40;

type Bundle = {
  draft: LayoutDocument;
  published: LayoutDocument;
  versions: LayoutVersionEntry[];
  dirty: boolean;
};

function cloneDoc(doc: LayoutDocument): LayoutDocument {
  return normalizeLayoutDocument(JSON.parse(JSON.stringify(doc)));
}

export default function LayoutBuilderClient() {
  const { lang } = useAdminI18n();
  const de = lang === "de";
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [doc, setDoc] = useState<LayoutDocument>(defaultLayoutDocument());
  const [viewport, setViewport] = useState<LayoutViewport>("desktop");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [history, setHistory] = useState<LayoutDocument[]>([]);
  const [future, setFuture] = useState<LayoutDocument[]>([]);
  const [, startTransition] = useTransition();
  const skipHistory = useRef(false);

  const dirtyLocal =
    bundle != null && !documentsEqual(doc, bundle.published);

  const pushPreview = useCallback(
    (next: LayoutDocument, vp: LayoutViewport) => {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      try {
        win.postMessage(
          { type: LAYOUT_PREVIEW_MESSAGE, document: next, viewport: vp },
          window.location.origin
        );
      } catch {
        /* ignore */
      }
    },
    []
  );

  const commit = useCallback(
    (updater: (prev: LayoutDocument) => LayoutDocument) => {
      setDoc((prev) => {
        const next = updater(cloneDoc(prev));
        next.updatedAt = new Date().toISOString();
        if (!skipHistory.current && !documentsEqual(prev, next)) {
          setHistory((h) => [...h.slice(-(HISTORY_LIMIT - 1)), cloneDoc(prev)]);
          setFuture([]);
        }
        skipHistory.current = false;
        startTransition(() => pushPreview(next, viewport));
        return next;
      });
    },
    [pushPreview, viewport]
  );

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setDoc((current) => {
        setFuture((f) => [cloneDoc(current), ...f].slice(0, HISTORY_LIMIT));
        skipHistory.current = true;
        startTransition(() => pushPreview(prev, viewport));
        return cloneDoc(prev);
      });
      return h.slice(0, -1);
    });
  }, [pushPreview, viewport]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      const [next, ...rest] = f;
      setDoc((current) => {
        setHistory((h) => [...h, cloneDoc(current)].slice(-HISTORY_LIMIT));
        skipHistory.current = true;
        startTransition(() => pushPreview(next, viewport));
        return cloneDoc(next);
      });
      return rest;
    });
  }, [pushPreview, viewport]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/layout");
        const data = (await res.json()) as Bundle & { error?: string };
        if (!res.ok) throw new Error(data.error || "Laden fehlgeschlagen");
        if (cancelled) return;
        setBundle(data);
        setDoc(cloneDoc(data.draft));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Fehler");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  useEffect(() => {
    if (!dirtyLocal) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirtyLocal]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if ((event.data as { type?: string })?.type === LAYOUT_PREVIEW_READY) {
        setPreviewReady(true);
        pushPreview(doc, viewport);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [doc, viewport, pushPreview]);

  useEffect(() => {
    if (!previewReady) return;
    pushPreview(doc, viewport);
  }, [viewport, previewReady, doc, pushPreview]);

  const api = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as Bundle & { error?: string; ok?: boolean };
      if (!res.ok) throw new Error(data.error || "Aktion fehlgeschlagen");
      setBundle(data);
      setDoc(cloneDoc(data.draft));
      setHistory([]);
      setFuture([]);
      pushPreview(data.draft, viewport);
      return data;
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = async () => {
    try {
      await api({ action: "save_draft", document: doc });
      toast.success(de ? "Entwurf gespeichert (nicht live)" : "تم حفظ المسودة");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler");
    }
  };

  const publish = async () => {
    try {
      await api({ action: "publish", document: doc });
      toast.success(de ? "Veröffentlicht — Live-Seite aktualisiert" : "تم النشر");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler");
    }
  };

  const discard = async () => {
    if (
      !confirm(
        de
          ? "Entwurf verwerfen und auf die Live-Version zurücksetzen?"
          : "تجاهل المسودة والعودة للنسخة المنشورة؟"
      )
    ) {
      return;
    }
    try {
      await api({ action: "discard" });
      toast.success(de ? "Entwurf verworfen" : "تم التجاهل");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler");
    }
  };

  const rollback = async (versionId: string) => {
    if (
      !confirm(
        de
          ? "Auf diese Version zurücksetzen? Der aktuelle Live-Stand wird archiviert."
          : "الرجوع إلى هذا الإصدار؟ سيتم أرشفة النسخة الحالية."
      )
    ) {
      return;
    }
    try {
      await api({ action: "rollback", versionId });
      toast.success(de ? "Version wiederhergestellt" : "تمت الاستعادة");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler");
    }
  };

  const patchChrome = <K extends keyof LayoutDocument["chrome"]>(
    key: K,
    value: LayoutDocument["chrome"][K]
  ) => {
    commit((prev) => {
      prev.chrome[key] = value;
      return prev;
    });
  };

  const patchSlider = <K extends keyof LayoutSliderStyle>(
    key: K,
    value: LayoutSliderStyle[K]
  ) => {
    commit((prev) => {
      prev.slider[viewport] = { ...prev.slider[viewport], [key]: value };
      return prev;
    });
  };

  const slider = doc.slider[viewport];
  const frameWidth = VIEWPORT_WIDTHS[viewport];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-gray-500 gap-2">
        <Loader2 className="animate-spin" size={20} />
        {de ? "Builder wird geladen…" : "جاري التحميل…"}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 min-h-[calc(100vh-6rem)]">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white border border-gray-200 px-4 py-3 shadow-sm">
        <div>
          <h1 className="text-lg font-semibold text-luxury-ink">
            {de ? "Visueller Page-Builder" : "منشئ الصفحات"}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {de
              ? "Änderungen bleiben Entwurf, bis du veröffentlichst."
              : "التغييرات تبقى مسودة حتى النشر."}
            {dirtyLocal && (
              <span className="ms-2 text-amber-600 font-medium">
                {de ? "• Ungespeicherte Änderungen" : "• تغييرات غير محفوظة"}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={!history.length || busy}
            className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl border text-sm disabled:opacity-40"
            title="Strg+Z"
          >
            <Undo2 size={16} /> {de ? "Rückgängig" : "تراجع"}
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!future.length || busy}
            className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl border text-sm disabled:opacity-40"
            title="Strg+Y"
          >
            <Redo2 size={16} /> {de ? "Wiederholen" : "إعادة"}
          </button>
          <button
            type="button"
            onClick={saveDraft}
            disabled={busy}
            className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl border border-gray-300 text-sm hover:bg-gray-50"
          >
            <Save size={16} /> {de ? "Entwurf speichern" : "حفظ المسودة"}
          </button>
          <button
            type="button"
            onClick={discard}
            disabled={busy || !dirtyLocal}
            className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl border border-red-200 text-red-700 text-sm hover:bg-red-50 disabled:opacity-40"
          >
            <RotateCcw size={16} /> {de ? "Verwerfen" : "تجاهل"}
          </button>
          <button
            type="button"
            onClick={publish}
            disabled={busy}
            className="inline-flex items-center gap-1.5 min-h-10 px-4 rounded-xl bg-gold text-luxury-black text-sm font-medium hover:brightness-105 disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {de ? "Veröffentlichen" : "نشر"}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4 flex-1 min-h-0">
        <aside className="rounded-2xl bg-white border border-gray-200 p-4 space-y-5 overflow-y-auto max-h-[calc(100vh-10rem)]">
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {de ? "Logo & Kopfleiste" : "الشعار والترويسة"}
            </h2>
            <label className="block text-sm">
              <span className="text-gray-600">
                {de ? "Logo-Größe" : "حجم الشعار"} ({doc.chrome.logoScale.toFixed(2)}×)
              </span>
              <input
                type="range"
                min={0.5}
                max={2.5}
                step={0.05}
                value={doc.chrome.logoScale}
                onChange={(e) => patchChrome("logoScale", Number(e.target.value))}
                className="w-full mt-1"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">{de ? "Header-Hintergrund" : "خلفية الترويسة"}</span>
              <div className="flex gap-2 mt-1">
                <input
                  type="color"
                  value={doc.chrome.headerBg || "#fff7ed"}
                  onChange={(e) => patchChrome("headerBg", e.target.value)}
                  className="h-10 w-12 rounded border"
                />
                <input
                  type="text"
                  value={doc.chrome.headerBg}
                  placeholder="#fff7ed oder leer"
                  onChange={(e) => patchChrome("headerBg", e.target.value)}
                  className="flex-1 min-h-10 px-2 rounded-lg border text-sm"
                />
              </div>
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">{de ? "Navbar-Farbe" : "لون الشريط"}</span>
              <div className="flex gap-2 mt-1">
                <input
                  type="color"
                  value={doc.chrome.navbarBg || "#fff7ed"}
                  onChange={(e) => patchChrome("navbarBg", e.target.value)}
                  className="h-10 w-12 rounded border"
                />
                <input
                  type="text"
                  value={doc.chrome.navbarBg}
                  placeholder="leer = Standard"
                  onChange={(e) => patchChrome("navbarBg", e.target.value)}
                  className="flex-1 min-h-10 px-2 rounded-lg border text-sm"
                />
              </div>
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">{de ? "Seiten-Hintergrund" : "خلفية الصفحة"}</span>
              <div className="flex gap-2 mt-1">
                <input
                  type="color"
                  value={doc.chrome.pageBg || "#fffbeb"}
                  onChange={(e) => patchChrome("pageBg", e.target.value)}
                  className="h-10 w-12 rounded border"
                />
                <input
                  type="text"
                  value={doc.chrome.pageBg}
                  placeholder="leer = Standard"
                  onChange={(e) => patchChrome("pageBg", e.target.value)}
                  className="flex-1 min-h-10 px-2 rounded-lg border text-sm"
                />
              </div>
            </label>
            <fieldset className="text-sm">
              <legend className="text-gray-600 mb-1">
                {de ? "Warenkorb-Position" : "موضع السلة"}
              </legend>
              <div className="flex gap-2">
                {(
                  [
                    ["end", de ? "Rechts / Ende" : "النهاية"],
                    ["start", de ? "Links / Anfang" : "البداية"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => patchChrome("cartPosition", value)}
                    className={cn(
                      "flex-1 min-h-10 rounded-xl border text-sm",
                      doc.chrome.cartPosition === value
                        ? "bg-gold/30 border-gold font-medium"
                        : "hover:bg-gray-50"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          </section>

          <section className="space-y-3 border-t pt-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {de ? `Slider (${viewport})` : `السلايدر (${viewport})`}
            </h2>
            <label className="block text-sm">
              <span className="text-gray-600">
                {de ? "Höhe (px, 0 = auto)" : "الارتفاع"}: {slider.heightPx}
              </span>
              <input
                type="range"
                min={0}
                max={720}
                step={8}
                value={slider.heightPx}
                onChange={(e) => patchSlider("heightPx", Number(e.target.value))}
                className="w-full mt-1"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">
                {de ? "Abstand vertikal" : "الهامش العمودي"}: {slider.marginY}px
              </span>
              <input
                type="range"
                min={-40}
                max={120}
                step={2}
                value={slider.marginY}
                onChange={(e) => patchSlider("marginY", Number(e.target.value))}
                className="w-full mt-1"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">
                {de ? "Vertikal verschieben" : "إزاحة عمودية"}: {slider.offsetY}px
              </span>
              <input
                type="range"
                min={-120}
                max={120}
                step={2}
                value={slider.offsetY}
                onChange={(e) => patchSlider("offsetY", Number(e.target.value))}
                className="w-full mt-1"
              />
            </label>
            <fieldset className="text-sm">
              <legend className="text-gray-600 mb-1">
                {de ? "Bildanpassung" : "ملاءمة الصورة"}
              </legend>
              <div className="flex gap-2">
                {(["contain", "cover"] as const).map((fit) => (
                  <button
                    key={fit}
                    type="button"
                    onClick={() => patchSlider("objectFit", fit)}
                    className={cn(
                      "flex-1 min-h-10 rounded-xl border text-sm capitalize",
                      slider.objectFit === fit
                        ? "bg-gold/30 border-gold font-medium"
                        : "hover:bg-gray-50"
                    )}
                  >
                    {fit}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="block text-sm">
              <span className="text-gray-600">
                {de ? "Bildposition" : "موضع الصورة"}
              </span>
              <select
                value={slider.objectPosition}
                onChange={(e) => patchSlider("objectPosition", e.target.value)}
                className="w-full mt-1 min-h-10 px-2 rounded-lg border text-sm"
              >
                {[
                  "center center",
                  "center top",
                  "center bottom",
                  "left center",
                  "right center",
                  "50% 20%",
                  "50% 80%",
                ].map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="space-y-2 border-t pt-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
              <History size={14} /> {de ? "Versionen / Rollback" : "الإصدارات"}
            </h2>
            {!bundle?.versions.length ? (
              <p className="text-xs text-gray-400">
                {de
                  ? "Noch keine Releases. Nach dem ersten Veröffentlichen erscheinen Snapshots hier."
                  : "لا إصدارات بعد."}
              </p>
            ) : (
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {bundle.versions.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-start justify-between gap-2 rounded-xl border px-3 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{v.label}</p>
                      <p className="text-gray-400">
                        {new Date(v.publishedAt).toLocaleString(
                          de ? "de-DE" : "ar"
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => rollback(v.id)}
                      className="shrink-0 min-h-9 px-2 rounded-lg border hover:bg-gray-50"
                    >
                      {de ? "Wiederherstellen" : "استعادة"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>

        <section className="rounded-2xl bg-zinc-100 border border-gray-200 flex flex-col min-h-[560px] overflow-hidden">
          <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white border-b">
            {(
              [
                ["desktop", Monitor, de ? "Desktop" : "سطح المكتب"],
                ["tablet", Tablet, de ? "Tablet" : "لوحة"],
                ["mobile", Smartphone, de ? "Mobile" : "جوال"],
              ] as const
            ).map(([key, Icon, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setViewport(key)}
                className={cn(
                  "inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl text-sm border",
                  viewport === key
                    ? "bg-luxury-ink text-white border-luxury-ink"
                    : "bg-white hover:bg-gray-50"
                )}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
            <span className="text-[11px] text-gray-400 ms-2">
              {frameWidth}px · Instant Preview
            </span>
          </div>
          <div className="flex-1 flex items-start justify-center p-4 overflow-auto">
            <div
              className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-300 transition-[width] duration-300 ease-out"
              style={{
                width: viewport === "desktop" ? "100%" : frameWidth,
                maxWidth: "100%",
                height: "min(780px, calc(100vh - 12rem))",
              }}
            >
              <iframe
                ref={iframeRef}
                title="Layout-Vorschau"
                src="/?_preview=1&_builder=1"
                className="w-full h-full border-0 bg-jmle-cream"
                onLoad={() => {
                  setPreviewReady(true);
                  pushPreview(doc, viewport);
                }}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
