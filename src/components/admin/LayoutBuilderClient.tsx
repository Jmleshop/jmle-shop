"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  Layers,
  Paintbrush,
  Image as ImageIcon,
  Type,
  LayoutTemplate,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAdminI18n } from "@/components/admin/AdminI18n";
import BuilderStructurePanel from "@/components/admin/BuilderStructurePanel";
import {
  LAYOUT_PREVIEW_MESSAGE,
  LAYOUT_PREVIEW_PING,
  LAYOUT_PREVIEW_READY,
  LAYOUT_PREVIEW_STRUCTURE,
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
import type { HomepageSection } from "@/types";

const HISTORY_LIMIT = 40;
const PREVIEW_PATH = "/?_preview=1&_builder=1";
const PREVIEW_HANDSHAKE_MS = 14000;

type TabId = "structure" | "header" | "banner" | "brands" | "colors";

type ContentBundle = {
  contentDraft: {
    homepageSections: HomepageSection[];
    slideOrders: Record<string, string[]>;
  };
  publishedContent: {
    homepageSections: HomepageSection[];
    slideOrders: Record<string, string[]>;
  };
  slides: Array<{
    id: string;
    title?: string;
    image?: string;
    slider_zone?: string;
  }>;
  layoutDraft: LayoutDocument;
  layoutPublished: LayoutDocument;
  dirty: boolean;
  versions?: LayoutVersionEntry[];
};

function cloneDoc(doc: LayoutDocument): LayoutDocument {
  return normalizeLayoutDocument(JSON.parse(JSON.stringify(doc)));
}

export default function LayoutBuilderClient() {
  const { lang } = useAdminI18n();
  const de = lang === "de";
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [bundle, setBundle] = useState<ContentBundle | null>(null);
  const [doc, setDoc] = useState<LayoutDocument>(defaultLayoutDocument());
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [slideOrders, setSlideOrders] = useState<Record<string, string[]>>({});
  const [slides, setSlides] = useState<ContentBundle["slides"]>([]);
  const [structureDirty, setStructureDirty] = useState(false);
  const [tab, setTab] = useState<TabId>("structure");
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
  const skipHistory = useRef(false);
  const docRef = useRef(doc);
  docRef.current = doc;
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;
  const slideOrdersRef = useRef(slideOrders);
  slideOrdersRef.current = slideOrders;

  const previewSrc =
    typeof window === "undefined"
      ? PREVIEW_PATH
      : `${window.location.origin}${PREVIEW_PATH}`;

  const dirtyLocal =
    (bundle != null && !documentsEqual(doc, bundle.layoutPublished)) ||
    structureDirty;

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

  const pushStructure = useCallback(
    (nextSections: HomepageSection[], orders: Record<string, string[]>) => {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      try {
        win.postMessage(
          {
            type: LAYOUT_PREVIEW_STRUCTURE,
            sections: nextSections,
            slideOrders: orders,
          },
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
      win.postMessage({ type: LAYOUT_PREVIEW_PING }, window.location.origin);
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
        pushPreview(next, viewport);
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
        pushPreview(prev, viewport);
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
        pushPreview(next, viewport);
        return cloneDoc(next);
      });
      return rest;
    });
  }, [pushPreview, viewport]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/builder/content");
        const data = (await res.json()) as ContentBundle & { error?: string };
        if (!res.ok) throw new Error(data.error || "Laden fehlgeschlagen");
        if (cancelled) return;
        setBundle(data);
        setDoc(cloneDoc(data.layoutDraft));
        setSections(data.contentDraft.homepageSections as HomepageSection[]);
        setSlideOrders(data.contentDraft.slideOrders || {});
        setSlides(data.slides || []);
        setStructureDirty(false);
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
        pushStructure(sectionsRef.current, slideOrdersRef.current);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [viewport, pushPreview, pushStructure]);

  useEffect(() => {
    if (!previewReady) return;
    pushPreview(doc, viewport);
  }, [viewport, previewReady, doc, pushPreview]);

  useEffect(() => {
    if (!previewReady) return;
    pushStructure(sections, slideOrders);
  }, [previewReady, sections, slideOrders, pushStructure]);

  useEffect(() => {
    if (!previewLoading) return;
    const started = Date.now();
    const pingTimer = window.setInterval(() => {
      if (Date.now() - started < PREVIEW_HANDSHAKE_MS) pingPreview();
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

  const contentApi = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/builder/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as ContentBundle & {
        error?: string;
        ok?: boolean;
      };
      if (!res.ok) throw new Error(data.error || "Aktion fehlgeschlagen");
      setBundle(data);
      setDoc(cloneDoc(data.layoutDraft));
      setSections(data.contentDraft.homepageSections as HomepageSection[]);
      setSlideOrders(data.contentDraft.slideOrders || {});
      setSlides(data.slides || []);
      setStructureDirty(false);
      setHistory([]);
      setFuture([]);
      pushPreview(data.layoutDraft, viewport);
      pushStructure(
        data.contentDraft.homepageSections as HomepageSection[],
        data.contentDraft.slideOrders || {}
      );
      return data;
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = async () => {
    try {
      await contentApi({
        action: "save_draft",
        document: doc,
        content: {
          homepageSections: sections,
          slideOrders,
          updatedAt: new Date().toISOString(),
        },
      });
      toast.success(de ? "Entwurf gespeichert (nicht live)" : "تم حفظ المسودة");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler");
    }
  };

  const publish = async () => {
    try {
      await contentApi({
        action: "publish",
        document: doc,
        content: {
          homepageSections: sections,
          slideOrders,
          updatedAt: new Date().toISOString(),
        },
      });
      toast.success(
        de ? "Veröffentlicht — Live-Seite aktualisiert" : "تم النشر"
      );
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
      await contentApi({ action: "discard" });
      toast.success(de ? "Entwurf verworfen" : "تم التجاهل");
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

  const patchHeader = <K extends keyof LayoutDocument["header"]>(
    key: K,
    value: LayoutDocument["header"][K]
  ) => {
    commit((prev) => {
      prev.header[key] = value;
      return prev;
    });
  };

  const patchBrands = <K extends keyof LayoutDocument["brands"]>(
    key: K,
    value: LayoutDocument["brands"][K]
  ) => {
    commit((prev) => {
      prev.brands[key] = value;
      return prev;
    });
  };

  const patchTypography = <K extends keyof LayoutDocument["typography"]>(
    key: K,
    value: LayoutDocument["typography"][K]
  ) => {
    commit((prev) => {
      prev.typography[key] = value;
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

  const onTitleChange = (sectionId: string, l: "ar" | "de", value: string) => {
    commit((prev) => {
      const cur = { ...(prev.sectionTitles[sectionId] || {}) };
      cur[l] = value;
      prev.sectionTitles = { ...prev.sectionTitles, [sectionId]: cur };
      return prev;
    });
    setSections((list) =>
      list.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              ...(l === "ar"
                ? { titleAr: value, title: value }
                : { titleDe: value }),
            }
          : s
      )
    );
    setStructureDirty(true);
  };

  const slider = doc.slider[viewport];
  const frameWidth = VIEWPORT_WIDTHS[viewport];

  const tabs: { id: TabId; label: string; icon: typeof Layers }[] = [
    { id: "structure", label: de ? "Struktur" : "الهيكل", icon: Layers },
    { id: "header", label: de ? "Kopfleiste" : "الترويسة", icon: LayoutTemplate },
    { id: "banner", label: de ? "Banner" : "البانر", icon: ImageIcon },
    { id: "brands", label: de ? "Marken" : "العلامات", icon: Paintbrush },
    { id: "colors", label: de ? "Farben/Typo" : "ألوان/خط", icon: Type },
  ];

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
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white/95 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setPanelOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          >
            {panelOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight truncate">
                {de ? "Live Page-Builder" : "منشئ الصفحات المباشر"}
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
                ? "Styles + Reihenfolge — live erst nach Veröffentlichen"
                : "الأنماط والترتيب — يظهر للعملاء بعد النشر"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={undo}
            disabled={!history.length || busy}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-35"
          >
            <Undo2 size={14} />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!future.length || busy}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-35"
          >
            <Redo2 size={14} />
          </button>
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
        {panelOpen && (
          <aside className="w-full max-w-[340px] shrink-0 border-e border-zinc-200 bg-white overflow-y-auto">
            <div className="flex gap-0.5 overflow-x-auto border-b border-zinc-100 px-2 pt-2">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-t-md px-2.5 py-2 text-[11px] font-medium whitespace-nowrap",
                    tab === id
                      ? "bg-zinc-100 text-zinc-900"
                      : "text-zinc-500 hover:text-zinc-800"
                  )}
                >
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>

            <div className="space-y-5 p-4 pb-10">
              {tab === "structure" && (
                <BuilderStructurePanel
                  de={de}
                  sections={sections}
                  slideOrders={slideOrders}
                  slides={slides}
                  sectionTitles={doc.sectionTitles}
                  onChangeSections={(next) => {
                    setSections(next);
                    setStructureDirty(true);
                    pushStructure(next, slideOrders);
                  }}
                  onChangeSlideOrders={(next) => {
                    setSlideOrders(next);
                    setStructureDirty(true);
                    pushStructure(sections, next);
                  }}
                  onTitleChange={onTitleChange}
                />
              )}

              {tab === "header" && (
                <section className="space-y-3">
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
                      ["scale", de ? "Header-Skalierung" : "مقياس الترويسة", 0.7, 1.4, 0.05],
                      ["paddingY", de ? "Padding vertikal" : "الحشو العمودي", 0, 48, 1],
                      ["gap", de ? "Innenabstand" : "المسافة", 0, 32, 1],
                      ["heightPx", de ? "Mindesthöhe (0=auto)" : "الارتفاع", 0, 200, 4],
                    ] as const
                  ).map(([key, label, min, max, step]) => (
                    <label key={key} className="block text-xs">
                      <span className="text-zinc-600">
                        {label}:{" "}
                        <span className="tabular-nums text-zinc-400">
                          {doc.header[key]}
                          {key === "scale" ? "×" : "px"}
                        </span>
                      </span>
                      <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={doc.header[key]}
                        onChange={(e) =>
                          patchHeader(key, Number(e.target.value))
                        }
                        className="mt-2 w-full accent-zinc-900"
                      />
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
                            "h-9 rounded-md border text-xs font-medium",
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
              )}

              {tab === "banner" && (
                <section className="space-y-3">
                  <p className="text-[11px] text-zinc-500">
                    {de ? `Viewport: ${viewport}` : `العرض: ${viewport}`}
                  </p>
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
                          {slider[key]}px
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
                </section>
              )}

              {tab === "brands" && (
                <section className="space-y-3">
                  {(
                    [
                      ["logoScale", de ? "Logo-Größe" : "حجم الشعار", 0.5, 2, 0.05],
                      ["gap", de ? "Abstand" : "المسافة", 0, 48, 1],
                      ["paddingY", de ? "Padding" : "الحشو", 0, 48, 1],
                      ["speed", de ? "Geschwindigkeit" : "السرعة", 0.4, 2.5, 0.1],
                    ] as const
                  ).map(([key, label, min, max, step]) => (
                    <label key={key} className="block text-xs">
                      <span className="text-zinc-600">
                        {label}:{" "}
                        <span className="tabular-nums text-zinc-400">
                          {doc.brands[key]}
                          {key === "logoScale" || key === "speed" ? "×" : "px"}
                        </span>
                      </span>
                      <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={doc.brands[key]}
                        onChange={(e) =>
                          patchBrands(key, Number(e.target.value))
                        }
                        className="mt-2 w-full accent-zinc-900"
                      />
                    </label>
                  ))}
                </section>
              )}

              {tab === "colors" && (
                <section className="space-y-3">
                  {(
                    [
                      ["headerBg", de ? "Header-Hintergrund" : "خلفية الترويسة", "chrome"],
                      ["navbarBg", de ? "Navbar-Farbe" : "لون الشريط", "chrome"],
                      ["pageBg", de ? "Seiten-Hintergrund" : "خلفية الصفحة", "chrome"],
                      ["headingColor", de ? "Überschrift-Farbe" : "لون العناوين", "typo"],
                      ["bodyColor", de ? "Textfarbe" : "لون النص", "typo"],
                      ["accentColor", de ? "Akzentfarbe" : "لون التمييز", "typo"],
                    ] as const
                  ).map(([key, label, group]) => {
                    const value =
                      group === "chrome"
                        ? doc.chrome[key as "headerBg" | "navbarBg" | "pageBg"]
                        : doc.typography[
                            key as "headingColor" | "bodyColor" | "accentColor"
                          ];
                    return (
                      <label key={key} className="block text-xs">
                        <span className="text-zinc-600">{label}</span>
                        <div className="mt-1.5 flex gap-2">
                          <input
                            type="color"
                            value={value || "#ffffff"}
                            onChange={(e) => {
                              if (group === "chrome") {
                                patchChrome(
                                  key as "headerBg",
                                  e.target.value
                                );
                              } else {
                                patchTypography(
                                  key as "headingColor",
                                  e.target.value
                                );
                              }
                            }}
                            className="h-9 w-10 cursor-pointer rounded-md border border-zinc-200 bg-white p-0.5"
                          />
                          <input
                            type="text"
                            value={value}
                            placeholder={de ? "leer = Standard" : "فارغ = افتراضي"}
                            onChange={(e) => {
                              if (group === "chrome") {
                                patchChrome(
                                  key as "headerBg",
                                  e.target.value
                                );
                              } else {
                                patchTypography(
                                  key as "headingColor",
                                  e.target.value
                                );
                              }
                            }}
                            className="h-9 flex-1 rounded-md border border-zinc-200 px-2.5 text-xs outline-none focus:border-zinc-400"
                          />
                        </div>
                      </label>
                    );
                  })}
                  <label className="block text-xs">
                    <span className="text-zinc-600">
                      {de ? "Überschrift-Skalierung" : "مقياس العناوين"}:{" "}
                      {doc.typography.headingScale.toFixed(2)}×
                    </span>
                    <input
                      type="range"
                      min={0.7}
                      max={1.6}
                      step={0.05}
                      value={doc.typography.headingScale}
                      onChange={(e) =>
                        patchTypography("headingScale", Number(e.target.value))
                      }
                      className="mt-2 w-full accent-zinc-900"
                    />
                  </label>
                  <fieldset className="text-xs">
                    <legend className="mb-1.5 text-zinc-600">
                      {de ? "Titel-Ausrichtung" : "محاذاة العنوان"}
                    </legend>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(["start", "center", "end"] as const).map((align) => (
                        <button
                          key={align}
                          type="button"
                          onClick={() =>
                            patchTypography("sectionTitleAlign", align)
                          }
                          className={cn(
                            "h-9 rounded-md border text-xs font-medium capitalize",
                            doc.typography.sectionTitleAlign === align
                              ? "border-zinc-900 bg-zinc-900 text-white"
                              : "border-zinc-200 bg-white hover:bg-zinc-50"
                          )}
                        >
                          {align}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </section>
              )}

              {bundle?.versions && bundle.versions.length > 0 && (
                <section className="space-y-2 border-t border-zinc-100 pt-5">
                  <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    <History size={12} /> {de ? "Versionen" : "الإصدارات"}
                  </h2>
                  <p className="text-[11px] text-zinc-400">
                    {de
                      ? "Rollback über Layout-API (Styles). Content-Snapshots ab v2."
                      : "الاستعادة عبر واجهة التخطيط."}
                  </p>
                </section>
              )}
            </div>
          </aside>
        )}

        <section className="relative flex-1 min-w-0 overflow-auto bg-zinc-100/80 p-4 sm:p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5">
              {(
                [
                  ["desktop", Monitor],
                  ["tablet", Tablet],
                  ["mobile", Smartphone],
                ] as const
              ).map(([vp, Icon]) => (
                <button
                  key={vp}
                  type="button"
                  onClick={() => setViewport(vp)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium",
                    viewport === vp
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-50"
                  )}
                >
                  <Icon size={13} />
                  <span className="hidden sm:inline capitalize">{vp}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={reloadPreview}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs text-zinc-600 hover:bg-zinc-50"
              >
                <RefreshCw size={13} />
                {de ? "Neu laden" : "إعادة"}
              </button>
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs text-zinc-600 hover:bg-zinc-50"
              >
                <ExternalLink size={13} />
                Live
              </a>
            </div>
          </div>

          <div className="relative">
            {(previewLoading || previewError) && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                {previewLoading && !previewError && (
                  <div className="rounded-xl bg-white/90 px-4 py-3 text-xs text-zinc-600 shadow ring-1 ring-zinc-200 flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    {de ? "Vorschau verbindet…" : "جارٍ الاتصال…"}
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
                  pingPreview();
                  window.setTimeout(() => {
                    pingPreview();
                    pushPreview(docRef.current, viewport);
                    pushStructure(sectionsRef.current, slideOrdersRef.current);
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
