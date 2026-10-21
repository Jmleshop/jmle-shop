"use client";

import Link from "next/link";
import { useShopLocale } from "@/components/ShopLocale";

const headingClass =
  "mb-4 font-ui text-sm font-semibold uppercase tracking-wider text-amber-200";
const linkClass =
  "text-sm text-orange-100/80 transition-colors hover:text-white";

export default function SiteFooter() {
  const { t } = useShopLocale();

  return (
    <footer className="relative mt-auto border-t border-white/10 bg-gradient-to-b from-gold-dark via-jmle-orange-dark to-jmle-mahogany text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 md:px-8">
        <div className="mb-10 text-center">
          <Link
            href="/"
            className="font-display text-3xl tracking-[0.28em] text-jmle-yellow transition-colors hover:text-white"
          >
            jmle
          </Link>
          <p className="mt-2 font-ui text-sm font-light text-orange-100/80">{t("tagline")}</p>
          <div
            className="mx-auto mt-5 h-px w-16 bg-gradient-to-l from-transparent via-amber-200/80 to-transparent"
            aria-hidden
          />
        </div>

        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div>
            <h2 className={headingClass}>{t("footerShop")}</h2>
            <ul className="space-y-2.5">
              <li>
                <Link href="/categories" className={linkClass}>
                  {t("categories")}
                </Link>
              </li>
              <li>
                <Link href="/wishlist" className={linkClass}>
                  {t("wishlist")}
                </Link>
              </li>
              <li>
                <Link href="/search" className={linkClass}>
                  {t("search")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h2 className={headingClass}>{t("footerAccount")}</h2>
            <ul className="space-y-2.5">
              <li>
                <Link href="/auth/login" className={linkClass}>
                  {t("login")}
                </Link>
              </li>
              <li>
                <Link href="/auth/register" className={linkClass}>
                  {t("register")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h2 className={headingClass}>{t("footerLegal")}</h2>
            <ul className="space-y-2.5">
              <li>
                <Link href="/impressum" className={linkClass}>
                  Impressum
                </Link>
              </li>
              <li>
                <Link href="/datenschutz" className={linkClass}>
                  Datenschutz
                </Link>
              </li>
              <li>
                <Link href="/agb" className={linkClass}>
                  Widerruf & AGB
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h2 className={headingClass}>{t("footerContact")}</h2>
            <ul className="space-y-2.5 text-sm text-orange-100/80">
              <li dir="ltr">info@jmle.de</li>
              <li>Coswig (Anhalt), Deutschland</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 py-6 text-center">
        <p className="font-ui text-xs text-orange-100/70">
          &copy; {new Date().getFullYear()} jmle. {t("rights")}
        </p>
      </div>
    </footer>
  );
}
