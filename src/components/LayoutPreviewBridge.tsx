"use client";

import { useEffect, useState } from "react";
import {
  LAYOUT_PREVIEW_MESSAGE,
  LAYOUT_PREVIEW_PING,
  LAYOUT_PREVIEW_READY,
  detectViewportWidth,
  layoutCssVars,
  normalizeLayoutDocument,
  type LayoutDocument,
  type LayoutViewport,
} from "@/lib/layout-builder";

function applyVars(doc: LayoutDocument, viewport: LayoutViewport) {
  const vars = layoutCssVars(doc, viewport);
  const root = document.documentElement;
  const chromeKeys = [
    "--layout-header-bg",
    "--layout-navbar-bg",
    "--layout-page-bg",
  ];
  for (const k of chromeKeys) {
    if (!(k in vars)) root.style.removeProperty(k);
  }
  for (const [k, v] of Object.entries(vars)) {
    root.style.setProperty(k, v);
  }
  root.dataset.layoutCart = doc.chrome.cartPosition;
  if (doc.chrome.pageBg) {
    document.body.style.backgroundColor = doc.chrome.pageBg;
  } else {
    document.body.style.removeProperty("background-color");
  }
}

function isBuilderPreviewFrame(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.self !== window.top) return true;
  } catch {
    // cross-origin parent → treat as iframe
    return true;
  }
  const q = window.location.search;
  return q.includes("_preview=1") || q.includes("_builder=1");
}

function emitReady() {
  try {
    window.parent?.postMessage(
      { type: LAYOUT_PREVIEW_READY },
      window.location.origin
    );
  } catch {
    /* ignore */
  }
}

/**
 * Wendet published Layout-CSS an und hört auf Admin-postMessage-Vorschau.
 * Kein useSearchParams/Suspense — Handshake darf nicht hinter Hydration warten.
 */
export default function LayoutPreviewBridge({
  published,
}: {
  published?: LayoutDocument | null;
}) {
  const [override, setOverride] = useState<LayoutDocument | null>(null);
  const publishedDoc = published ?? null;

  // Published layout → CSS vars (live site)
  useEffect(() => {
    if (override) return;
    if (!publishedDoc) return;
    const apply = () => {
      const vp = detectViewportWidth(window.innerWidth);
      applyVars(publishedDoc, vp);
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [publishedDoc, override]);

  // Instant preview via postMessage (admin iframe)
  useEffect(() => {
    if (!isBuilderPreviewFrame()) return;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;
      const type = (data as { type?: string }).type;

      if (type === LAYOUT_PREVIEW_PING) {
        emitReady();
        return;
      }

      if (type !== LAYOUT_PREVIEW_MESSAGE) return;
      const doc = normalizeLayoutDocument(
        (data as { document?: unknown }).document
      );
      const viewport = ((data as { viewport?: LayoutViewport }).viewport ||
        detectViewportWidth(window.innerWidth)) as LayoutViewport;
      setOverride(doc);
      applyVars(doc, viewport);
    };

    window.addEventListener("message", onMessage);

    // READY mehrfach senden — Parent kann Listener später registrieren
    emitReady();
    const retries = [80, 250, 600, 1200, 2500].map((ms) =>
      window.setTimeout(emitReady, ms)
    );

    return () => {
      window.removeEventListener("message", onMessage);
      for (const id of retries) window.clearTimeout(id);
    };
  }, []);

  return null;
}
