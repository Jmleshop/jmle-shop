"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  shopText,
  type ShopLang,
  type ShopMsgKey,
  type ShopTextOverrides,
} from "@/lib/shop-i18n";

const STORAGE_KEY = "jmle-shop-lang";

const Ctx = createContext<{
  lang: ShopLang;
  setLang: (lang: ShopLang) => void;
  t: (key: ShopMsgKey, vars?: Record<string, string | number>) => string;
} | null>(null);

export function ShopLocaleProvider({
  children,
  overrides,
}: {
  children: ReactNode;
  /** Im Admin unter „Shop-Texte“ geänderte arabische Texte */
  overrides?: ShopTextOverrides;
}) {
  const pathname = usePathname();
  // Kundenseite nur Arabisch (Inhaber-Entscheidung 2026-10-26). Der Kontext bleibt,
  // damit Komponenten unverändert `lang`/`t` nutzen; ein früher gespeichertes "de"
  // wird ignoriert und entfernt.
  const lang: ShopLang = "ar";

  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* Speicher evtl. gesperrt */
    }
  }, []);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    document.documentElement.lang = lang === "ar" ? "ar" : "de";
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang, pathname]);

  // Keine Sprachwahl mehr; bleibt als No-op für bestehende Aufrufer.
  const setLang = (next: ShopLang) => {
    void next;
  };

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t: (key: ShopMsgKey, vars?: Record<string, string | number>) =>
        shopText(lang, key, vars, overrides),
    }),
    [lang, overrides]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShopLocale() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useShopLocale");
  return ctx;
}
