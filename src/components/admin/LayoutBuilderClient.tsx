"use client";

import {
  useCallback,
  useEffect,
  useMemo,
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
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAdminI18n } from "@/components/admin/AdminI18n";
import {
  LAYOUT_PREVIEW_MESSAGE,
  LAYOUT_PREVIEW_PING,
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
const PREVIEW_PATH = "/?_preview=1&_builder=1";
const PREVIEW_HANDSHAKE_MS = 14000;

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
  const [previewError, setPreviewError] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);
  const [history, setHistory] = useState<LayoutDocument[]>([]);
  const [future, setFuture] = useState<LayoutDocument[]>([]);
  const [, startTransition] = useTransition();
  const skipHistory = useRef(false);
  const docRef = useRef(doc);
  docRef.current = doc;

  const previewSrc = useMemo(() => {
    if (typeof window === "undefined") return PREVIEW_PATH;
    return `${window.location.origin}${PREVIEW_PATH}`;
  }, [iframeKey]);

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

  const pingPreview = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(
        { type: LAYOUT_PREVIEW_PING },
        window.location.origin
      );
    } catch {
      /* ignore */
    }
  }, []);

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

  // Soft-Nav von anderen Admin-Seiten kann COEP am Document behalten → iframe blockiert.
  // Einmal hart neu laden, damit Middleware ohne COEP greift.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = "jmle-builder-coep-reload";
    if (!window.crossOriginIsolated) {
      sessionStorage.removeItem(key);
      return;
    }
    if (sessionStorage.getItem(key) === "1") return;
    sessionStorage.setItem(key, "1");
    window.location.reload();
  }, []);

  const previewReadyRef = useRef(false);
  previewReadyRef.current = previewReady;

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if ((event.data as { type?: string })?.type === LAYOUT_PREVIEW_READY) {
        setPreviewReady(true);
        setPreviewError(false);
        setPreviewLoading(false);
        pushPreview(docRef.current, viewport);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [viewport, pushPreview]);

  useEffect(() => {
    if (!previewReady) return;
    pushPreview(doc, viewport);
  }, [viewport, previewReady, doc, pushPreview]);

  // Handshake: READY ist einzige Erfolgsquelle; Ping bis Timeout
  useEffect(() => {
    if (!previewLoading) return;
    const started = Date.now();
    const pingTimer = window.setInterval(() => {
      if (Date.now() - started < PREVIEW_HANDSHAKE_MS) {
        pingPreview();
      }
    }, 400);
    const failTimer = window.setTimeout(() => {
      if (!previewReadyRef.current) {
        setPreviewError(true);
        setPreviewLoading(false);
      }
    }, PREVIEW_HANDSHAKE_MS);
    pingPreview();
    return () => {
      window.clearInterval(pingTimer);
      window.clearTimeout(failTimer);
    };
  }, [previewLoading, iframeKey, pingPreview]);

  const reloadPreview = () => {
    setPreviewReady(false);
    setPreviewError(false);
    setPreviewLoading(true);
    setIframeKey((k) => k + 1);
  };

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
      reloadPreview();
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
      reloadPreview();
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
      <div className="flex items-center justify-center min-h-[60vh] text-zinc-500 gap-2">
        <Loader2 className="animate-spin" size={20} />
        {de ? "Page-Builder wird geladen…" : "جاري التحميل…"}
      </div>
    );
  }

  return (
    <div className="-m-4 sm:-m-6 min-h-[calc(100vh-3.5rem)] flex flex-col bg-zinc-50 text-zinc-900">
      {/* Top bar — Shopify/Webflow style */}
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white/95 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setPanelOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            title={panelOpen ? "Panel ausblenden" : "Panel einblenden"}
          >
            {panelOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight truncate">
                {de ? "Page-Builder" : "منشئ الصفحات"}
              </h1>
              {dirtyLocal ? (
                <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">
                  {de ? "Entwurf" : "مسودة"}
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                  {de ? "Live-Sync" : "متزامن"}
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 truncate">
              {de
                ? "Änderungen gelten erst nach Veröffentlichen"
                : "التغييرات تُطبَّق بعد النشر فقط"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={undo}
            disabled={!history.length || busy}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-35"
            title="Ctrl+Z"
          >
            <Undo2 size={14} />
            <span className="hidden sm:inline">{de ? "Rückgängig" : "تراجع"}</span>
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!future.length || busy}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-35"
            title="Ctrl+Y"
          >
            <Redo2 size={14} />
            <span className="hidden sm:inline">{de ? "Wiederholen" : "إعادة"}</span>
          </button>
          <div className="mx-1 hidden h-5 w-px bg-zinc-200 sm:block" />
          <button
            type="button"
            onClick={saveDraft}
            disabled={busy}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <Save size={14} />
            {de ? "Entwurf" : "مسودة"}
          </button>
          <button
            type="button"
            onClick={discard}
            disabled={busy || !dirtyLocal}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-35"
          >
            <RotateCcw size={14} />
            {de ? "Verwerfen" : "تجاهل"}
          </button>
          <button
            type="button"
            onClick={publish}
            disabled={busy}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Upload size={14} />
            )}
            {de ? "Veröffentlichen" : "نشر"}
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Controls panel */}
        {panelOpen && (
          <aside className="w-full max-w-[320px] shrink-0 border-e border-zinc-200 bg-white overflow-y-auto">
            <div className="space-y-6 p-4 pb-10">
              <section className="space-y-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  {de ? "Logo & Kopfleiste" : "الشعار والترويسة"}
                </h2>
                <label className="block text-xs">
                  <span className="text-zinc-600">
                    {de ? "Logo-Größe" : "حجم الشعار"}{" "}
                    <span className="tabular-nums text-zinc-400">
                      {doc.chrome.logoScale.toFixed(2)}×
                    </span>
                  </span>
                  <input
                    type="range"
                    min={0.5}
                    max={2.5}
                    step={0.05}
                    value={doc.chrome.logoScale}
                    onChange={(e) =>
                      patchChrome("logoScale", Number(e.target.value))
                    }
                    className="mt-2 w-full accent-zinc-900"
                  />
                </label>
                {(
                  [
                    ["headerBg", de ? "Header-Hintergrund" : "خلفية الترويسة"],
                    ["navbarBg", de ? "Navbar-Farbe" : "لون الشريط"],
                    ["pageBg", de ? "Seiten-Hintergrund" : "خلفية الصفحة"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block text-xs">
                    <span className="text-zinc-600">{label}</span>
                    <div className="mt-1.5 flex gap-2">
                      <input
                        type="color"
                        value={doc.chrome[key] || "#ffffff"}
                        onChange={(e) => patchChrome(key, e.target.value)}
                        className="h-9 w-10 cursor-pointer rounded-md border border-zinc-200 bg-white p-0.5"
                      />
                      <input
                        type="text"
                        value={doc.chrome[key]}
                        placeholder={de ? "leer = Standard" : "فارغ = افتراضي"}
                        onChange={(e) => patchChrome(key, e.target.value)}
                        className="h-9 flex-1 rounded-md border border-zinc-200 px-2.5 text-xs outline-none focus:border-zinc-400"
                      />
                    </div>
                  </label>
                ))}
                <fieldset className="text-xs">
                  <legend className="mb-1.5 text-zinc-600">
                    {de ? "Warenkorb-Position" : "موضع السلة"}
                  </legend>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        ["end", de ? "Ende / Rechts" : "النهاية"],
                        ["start", de ? "Anfang / Links" : "البداية"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => patchChrome("cartPosition", value)}
                        className={cn(
                          "h-9 rounded-md border text-xs font-medium transition-colors",
                          doc.chrome.cartPosition === value
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </section>

              <section className="space-y-3 border-t border-zinc-100 pt-5">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  {de ? `Slider · ${viewport}` : `السلايدر · ${viewport}`}
                </h2>
                {(
                  [
                    ["heightPx", de ? "Höhe (0 = auto)" : "الارتفاع", 0, 720, 8],
                    ["marginY", de ? "Abstand vertikal" : "الهامش", -40, 120, 2],
                    ["offsetY", de ? "Verschieben" : "إزاحة", -120, 120, 2],
                  ] as const
                ).map(([key, label, min, max, step]) => (
                  <label key={key} className="block text-xs">
                    <span className="text-zinc-600">
                      {label}:{" "}
                      <span className="tabular-nums text-zinc-400">
                        {slider[key]}
                        {key === "heightPx" ? "px" : "px"}
                      </span>
                    </span>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={slider[key]}
                      onChange={(e) =>
                        patchSlider(key, Number(e.target.value))
                      }
                      className="mt-2 w-full accent-zinc-900"
                    />
                  </label>
                ))}
                <fieldset className="text-xs">
                  <legend className="mb-1.5 text-zinc-600">
                    {de ? "Bildanpassung" : "ملاءمة الصورة"}
                  </legend>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(["contain", "cover"] as const).map((fit) => (
                      <button
                        key={fit}
                        type="button"
                        onClick={() => patchSlider("objectFit", fit)}
                        className={cn(
                          "h-9 rounded-md border text-xs font-medium capitalize",
                          slider.objectFit === fit
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 bg-white hover:bg-zinc-50"
                        )}
                      >
                        {fit}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label className="block text-xs">
                  <span className="text-zinc-600">
                    {de ? "Bildposition" : "موضع الصورة"}
                  </span>
                  <select
                    value={slider.objectPosition}
                    onChange={(e) =>
                      patchSlider("objectPosition", e.target.value)
                    }
                    className="mt-1.5 h-9 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs outline-none focus:border-zinc-400"
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

              <section className="space-y-2 border-t border-zinc-100 pt-5">
                <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  <History size={12} /> {de ? "Versionen" : "الإصدارات"}
                </h2>
                {!bundle?.versions.length ? (
                  <p className="text-[11px] leading-relaxed text-zinc-400">
                    {de
                      ? "Nach dem ersten Veröffentlichen erscheinen hier Snapshots zum Rollback."
                      : "بعد أول نشر تظهر هنا نسخ للاستعادة."}
                  </p>
                ) : (
                  <ul className="space-y-1.5 max-h-52 overflow-y-auto">
                    {bundle.versions.map((v) => (
                      <li
                        key={v.id}
                        className="flex items-start justify-between gap-2 rounded-lg border border-zinc-100 bg-zinc-50/80 px-2.5 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">{v.label}</p>
                          <p className="text-[10px] text-zinc-400">
                            {new Date(v.publishedAt).toLocaleString(
                              de ? "de-DE" : "ar"
                            )}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => rollback(v.id)}
                          className="shrink-0 h-8 rounded-md border border-zinc-200 bg-white px-2 text-[10px] font-medium hover:bg-white"
                        >
                          {de ? "Zurück" : "استعادة"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </aside>
        )}

        {/* Preview canvas */}
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-white px-3 py-2">
            <div className="inline-flex rounded-lg border border-zinc-200 p-0.5 bg-zinc-50">
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
                    "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
                    viewport === key
                      ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200"
                      : "text-zinc-500 hover:text-zinc-800"
                  )}
                >
                  <Icon size={14} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] tabular-nums text-zinc-400">
                {viewport === "desktop" ? "Fluid" : `${frameWidth}px`}
              </span>
              <button
                type="button"
                onClick={reloadPreview}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 text-xs text-zinc-600 hover:bg-zinc-50"
              >
                <RefreshCw size={13} />
                {de ? "Neu laden" : "إعادة"}
              </button>
              <a
                href={PREVIEW_PATH}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 text-xs text-zinc-600 hover:bg-zinc-50"
              >
                <ExternalLink size={13} />
                {de ? "Neues Tab" : "تبويب"}
              </a>
            </div>
          </div>

          <div className="relative flex flex-1 items-stretch justify-center overflow-auto bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] [background-size:16px_16px] p-4 sm:p-6">
            {(previewLoading || previewError) && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                {previewLoading && !previewError && (
                  <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs text-zinc-600 shadow-md ring-1 ring-zinc-200">
                    <Loader2 size={14} className="animate-spin" />
                    {de ? "Vorschau wird geladen…" : "جاري تحميل المعاينة…"}
                  </div>
                )}
                {previewError && (
                  <div className="pointer-events-auto mx-4 max-w-sm rounded-xl bg-white p-4 text-center shadow-lg ring-1 ring-zinc-200">
                    <AlertTriangle
                      className="mx-auto mb-2 text-amber-500"
                      size={22}
                    />
                    <p className="text-sm font-medium text-zinc-800">
                      {de
                        ? "Vorschau konnte nicht geladen werden"
                        : "تعذّر تحميل المعاينة"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {de
                        ? "Bitte neu laden. Falls der Fehler bleibt, Seite einmal hart refreshen."
                        : "أعد التحميل أو حدّث الصفحة."}
                    </p>
                    <button
                      type="button"
                      onClick={reloadPreview}
                      className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-xs font-medium text-white"
                    >
                      <RefreshCw size={13} />
                      {de ? "Erneut versuchen" : "إعادة المحاولة"}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div
              className="relative mx-auto overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-xl transition-[width,max-width] duration-300 ease-out"
              style={{
                width: viewport === "desktop" ? "100%" : frameWidth,
                maxWidth: "100%",
                height: "min(820px, calc(100vh - 9rem))",
              }}
            >
              <iframe
                key={iframeKey}
                ref={iframeRef}
                title="Shop-Vorschau"
                src={previewSrc}
                className="h-full w-full border-0 bg-[#fffbeb]"
                referrerPolicy="same-origin"
                onLoad={() => {
                  // onLoad ≠ Bridge bereit — nur anstoßen, READY setzt den State
                  pingPreview();
                  window.setTimeout(() => {
                    pingPreview();
                    pushPreview(docRef.current, viewport);
                  }, 150);
                }}
                onError={() => {
                  setPreviewError(true);
                  setPreviewLoading(false);
                  setPreviewReady(false);
                }}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
