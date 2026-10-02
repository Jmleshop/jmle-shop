"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  LAYOUT_PREVIEW_MESSAGE,
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

function clearPreviewFlags() {
  const root = document.documentElement;
  delete root.dataset.layoutPreview;
}

function BridgeInner({
  published,
}: {
  published: LayoutDocument | null;
}) {
  const searchParams = useSearchParams();
  const isBuilderPreview =
    searchParams.get("_preview") === "1" ||
    searchParams.get("_builder") === "1" ||
    (typeof window !== "undefined" && window.self !== window.top);

  const [override, setOverride] = useState<LayoutDocument | null>(null);

  // Published layout → CSS vars (live site)
  useEffect(() => {
    if (override) return;
    if (!published) return;
    const apply = () => {
      const vp = detectViewportWidth(window.innerWidth);
      applyVars(published, vp);
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [published, override]);

  // Instant preview via postMessage (admin iframe)
  useEffect(() => {
    if (!isBuilderPreview) return;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if ((data as { type?: string }).type !== LAYOUT_PREVIEW_MESSAGE) return;
      const doc = normalizeLayoutDocument(
        (data as { document?: unknown }).document
      );
      const viewport = ((data as { viewport?: LayoutViewport }).viewport ||
        detectViewportWidth(window.innerWidth)) as LayoutViewport;
      setOverride(doc);
      applyVars(doc, viewport);
    };

    window.addEventListener("message", onMessage);
    // Parent wissen lassen, dass die Vorschau bereit ist
    try {
      window.parent?.postMessage(
        { type: LAYOUT_PREVIEW_READY },
        window.location.origin
      );
    } catch {
      /* ignore */
    }

    return () => {
      window.removeEventListener("message", onMessage);
      clearPreviewFlags();
    };
  }, [isBuilderPreview]);

  return null;
}

/** Wendet published Layout-CSS an und hört auf Admin-postMessage-Vorschau. */
export default function LayoutPreviewBridge({
  published,
}: {
  published?: LayoutDocument | null;
}) {
  return (
    <Suspense fallback={null}>
      <BridgeInner published={published ?? null} />
    </Suspense>
  );
}
