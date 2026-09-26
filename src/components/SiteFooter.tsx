"use client";

import Link from "next/link";
import { useShopLocale } from "@/components/ShopLocale";

export default function SiteFooter() {
  const { t } = useShopLocale();
  return (
    <footer className="relative bg-gradient-to-b from-gold-dark via-jmle-orange-dark to-jmle-mahogany text-white py-14 px-4 md:px-8 mt-auto border-t border-amber-200/20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <Link
            href="/"
            className="font-display text-3xl tracking-[0.28em] text-jmle-yellow hover:text-white transition-colors"
          >
            jmle
          </Link>
          <p className="text-jmle-ocher/80 text-sm mt-2 font-ui font-light">
            {t("tagline")}
          </p>
          <div className="gold-divider !via-jmle-yellow/80 !mb-0 !mt-4" aria-hidden />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm mb-10">
          <div>
            <h4 className="font-ui text-jmle-yellow mb-3 font-medium">{t("footerShop")}</h4>
            <ul className="space-y-2.5 text-white/70 font-body">
              <li>
                <Link href="/categories" className="hover:text-white transition-colors">
                  {t("categories")}
                </Link>
              </li>
              <li>
                <Link href="/wishlist" className="hover:text-white transition-colors">
                  {t("wishlist")}
                </Link>
              </li>
              <li>
                <Link href="/search" className="hover:text-white transition-colors">
                  {t("search")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-ui text-jmle-yellow mb-3 font-medium">{t("footerAccount")}</h4>
            <ul className="space-y-2.5 text-white/70 font-body">
              <li>
                <Link href="/auth/login" className="hover:text-white transition-colors">
                  {t("login")}
                </Link>
              </li>
              <li>
                <Link href="/auth/register" className="hover:text-white transition-colors">
                  {t("register")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-ui text-jmle-yellow mb-3 font-medium">{t("footerLegal")}</h4>
            <ul className="space-y-2.5 text-white/70 font-body">
              <li>
                <Link href="/legal/impressum" className="hover:text-white transition-colors">
                  Impressum
                </Link>
              </li>
              <li>
                <Link href="/legal/datenschutz" className="hover:text-white transition-colors">
                  Datenschutz
                </Link>
              </li>
              <li>
                <Link href="/legal/widerruf" className="hover:text-white transition-colors">
                  Widerrufsbelehrung
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-ui text-jmle-yellow mb-3 font-medium">{t("footerContact")}</h4>
            <ul className="space-y-2.5 text-white/70 font-body">
              <li dir="ltr">info@jmle.de</li>
              <li>Coswig (Anhalt), Deutschland</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 text-center text-xs text-white/45 font-ui">
          <p>&copy; {new Date().getFullYear()} jmle. {t("rights")}</p>
        </div>
      </div>
    </footer>
  );
}
