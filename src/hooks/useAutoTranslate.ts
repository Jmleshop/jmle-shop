"use client";

import type { ShopLang } from "@/lib/shop-i18n";

/**
 * Text in der Zielsprache, sonst der vorhandene Originaltext.
 * Früher wurde fehlender Text per /api/translate maschinell übersetzt; das ist
 * abgeschaltet (keine erfundenen Übersetzungen, Route nur noch für Personal).
 * Signatur bleibt, damit die Aufrufer unverändert bleiben.
 */
export function useAutoTranslate(
  _lang: ShopLang,
  preferred: string | null | undefined,
  fallback: string | null | undefined
): string {
  return (preferred ?? "").trim() || (fallback ?? "").trim();
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
