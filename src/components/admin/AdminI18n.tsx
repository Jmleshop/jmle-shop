"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { adminMessages, type AdminLang, type AdminMsgKey } from "@/lib/admin-i18n";

const Ctx = createContext<{
  lang: AdminLang;
  setLang: (l: AdminLang) => void;
  t: (key: AdminMsgKey) => string;
} | null>(null);

export function AdminI18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<AdminLang>("de");

  useEffect(() => {
    const stored = localStorage.getItem("jmle-admin-lang");
    if (stored === "ar" || stored === "de") setLangState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "ar" ? "ar" : "de";
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = (l: AdminLang) => {
    setLangState(l);
    localStorage.setItem("jmle-admin-lang", l);
  };

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t: (key: AdminMsgKey) => adminMessages[lang][key],
    }),
    [lang]
  );

  return (
    <Ctx.Provider value={value}>
      <div dir={lang === "ar" ? "rtl" : "ltr"} className="contents">
        {children}
      </div>
    </Ctx.Provider>
  );
}

export function useAdminI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAdminI18n");
  return ctx;
}
