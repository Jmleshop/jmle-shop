"use client";

import { useEffect, useState } from "react";
import {
  LAYOUT_PREVIEW_MESSAGE,
  LAYOUT_PREVIEW_PING,
  LAYOUT_PREVIEW_READY,
  LAYOUT_PREVIEW_STRUCTURE,
  detectViewportWidth,
  layoutCssVars,
  normalizeLayoutDocument,
  type LayoutDocument,
  type LayoutViewport,
} from "@/lib/layout-builder";

function applyVars(doc: LayoutDocument, viewport: LayoutViewport) {
  const vars = layoutCssVars(doc, viewport);
  const root = document.documentElement;
  const optionalKeys = [
    "--layout-header-bg",
    "--layout-navbar-bg",
    "--layout-page-bg",
    "--layout-heading-color",
    "--layout-body-color",
    "--layout-accent",
  ];
  for (const k of optionalKeys) {
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
  if (doc.typography.bodyColor) {
    document.body.style.color = doc.typography.bodyColor;
  } else {
    document.body.style.removeProperty("color");
  }
}

function isBuilderPreviewFrame(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.self !== window.top) return true;
  } catch {
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
 */
export default function LayoutPreviewBridge({
  published,
}: {
  published?: LayoutDocument | null;
}) {
  const [override, setOverride] = useState<LayoutDocument | null>(null);
  const publishedDoc = published ?? null;

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

      if (type === LAYOUT_PREVIEW_STRUCTURE) {
        // HomeSections hört selbst auf STRUCTURE — Bridge bleibt schlank
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
