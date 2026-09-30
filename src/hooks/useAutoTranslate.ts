"use client";

import { useEffect, useState } from "react";
import type { ShopLang } from "@/lib/shop-i18n";

const mem = new Map<string, string>();

function key(text: string, from: ShopLang, to: ShopLang) {
  return `${from}|${to}|${text.trim().toLowerCase()}`;
}

/**
 * Übersetzt fehlenden Zieltext im Hintergrund (DE↔AR).
 * `preferred` hat Vorrang; sonst wird `fallback` via /api/translate geholt.
 */
export function useAutoTranslate(
  lang: ShopLang,
  preferred: string | null | undefined,
  fallback: string | null | undefined
): string {
  const pref = (preferred ?? "").trim();
  const fb = (fallback ?? "").trim();
  const initial = pref || fb;
  const [text, setText] = useState(initial);

  useEffect(() => {
    if (pref) {
      setText(pref);
      return;
    }
    if (!fb) {
      setText("");
      return;
    }
    const from: ShopLang = lang === "de" ? "ar" : "de";
    const to = lang;
    const k = key(fb, from, to);
    const hit = mem.get(k);
    if (hit) {
      setText(hit);
      return;
    }
    setText(fb);
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: fb, from, to }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { translation?: string };
        const out = (data.translation ?? "").trim();
        if (!out || cancelled) return;
        mem.set(k, out);
        setText(out);
      } catch {
        /* keep fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lang, pref, fb]);

  return text;
}

/** Synchroner Prefer-Fallback ohne Netzwerk (für SSR / erste Paint). */
export function pickLocalized(
  lang: ShopLang,
  primary: string | null | undefined,
  secondary: string | null | undefined
): string {
  if (lang === "de") {
    return (primary ?? "").trim() || (secondary ?? "").trim() || "";
  }
  return (secondary ?? "").trim() || (primary ?? "").trim() || "";
}
