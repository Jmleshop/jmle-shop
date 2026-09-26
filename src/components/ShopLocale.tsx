"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { shopText, type ShopLang, type ShopMsgKey } from "@/lib/shop-i18n";

const STORAGE_KEY = "jmle-shop-lang";

const Ctx = createContext<{
  lang: ShopLang;
  setLang: (lang: ShopLang) => void;
  t: (key: ShopMsgKey) => string;
} | null>(null);

export function ShopLocaleProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [lang, setLangState] = useState<ShopLang>("ar");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "de" || stored === "ar") setLangState(stored);
  }, []);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    document.documentElement.lang = lang === "ar" ? "ar" : "de";
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang, pathname]);

  const setLang = (next: ShopLang) => {
    setLangState(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t: (key: ShopMsgKey) => shopText(lang, key),
    }),
    [lang]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShopLocale() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useShopLocale");
  return ctx;
}
