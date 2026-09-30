"use client";

import { useEffect, useState } from "react";
import { preloadBackgroundRemoval } from "@/lib/image-editor/remove-background";

/**
 * Lädt das FP16-ONNX-Modell + WASM beim Betreten des Admin-Bereichs vor,
 * damit der erste Freisteller ohne Modell-Download startet.
 */
export default function BgRemovalPreloader() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const idle =
      typeof window !== "undefined" && "requestIdleCallback" in window
        ? (window as Window & {
            requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number;
          }).requestIdleCallback
        : null;

    const start = () => {
      void preloadBackgroundRemoval()
        .then(() => {
          if (!cancelled) setReady(true);
        })
        .catch(() => {
          /* silent — Fallback greift zur Laufzeit */
        });
    };

    const id = idle ? idle(start, { timeout: 1200 }) : window.setTimeout(start, 200);
    return () => {
      cancelled = true;
      if (!idle) window.clearTimeout(id);
    };
  }, []);

  // Unsichtbarer Status-Hook für DevTools / zukünftige Toasts
  return (
    <span
      className="sr-only"
      data-bg-removal={ready ? "ready" : "loading"}
      aria-hidden
    />
  );
}
