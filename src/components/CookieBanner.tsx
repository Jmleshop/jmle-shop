"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const STORAGE_KEY = "jmle-cookie-consent";

export function readCookieConsent(): "all" | "necessary" | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === "all" || value === "necessary" ? value : null;
}

export default function CookieBanner() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(readCookieConsent() == null);
  }, []);

  if (!visible || pathname.startsWith("/admin")) return null;

  const choose = (value: "all" | "necessary") => {
    window.localStorage.setItem(STORAGE_KEY, value);
    window.dispatchEvent(new Event("jmle-cookie-consent"));
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookies"
      className="fixed inset-x-3 z-[60] rounded-2xl border border-amber-200/80 bg-white/95 p-4 shadow-boutique backdrop-blur-md bottom-[4.75rem] md:bottom-4 md:inset-x-auto md:end-4 md:max-w-md"
    >
      <p className="text-sm leading-relaxed text-luxury-ink">
        Wir speichern nur, was der Shop braucht (Sitzung und Warenkorb). Optionale
        Reichweitenmessung startet erst, wenn Sie zustimmen. Details in der{" "}
        <Link href="/datenschutz" className="text-brand-orange underline underline-offset-2">
          Datenschutzerklärung
        </Link>
        .
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => choose("necessary")}
          className="min-h-11 rounded-xl border border-amber-200 px-4 text-sm font-ui text-luxury-ink"
        >
          Nur notwendige
        </button>
        <button
          type="button"
          onClick={() => choose("all")}
          className="min-h-11 rounded-xl bg-brand-orange px-4 text-sm font-ui text-white"
        >
          Alle akzeptieren
        </button>
      </div>
    </div>
  );
}
