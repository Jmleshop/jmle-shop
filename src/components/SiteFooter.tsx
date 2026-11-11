"use client";

import Image from "next/image";
import Link from "next/link";
import { useShopLocale } from "@/components/ShopLocale";
import BrandMark from "@/components/BrandMark";
import { BUSINESS_INFO } from "@/lib/business-info";
import { originalImageSrc, SHOP_IMAGE_QUALITY } from "@/lib/sharp-image";

const linkClass = "text-luxury-ink/75 hover:text-brand-orange transition-colors";
const headingClass = "font-ui text-brand-red mb-3 font-bold";

export default function SiteFooter({
  logoUrl = "",
  siteName = "jmle",
}: {
  logoUrl?: string;
  siteName?: string;
}) {
  const { t } = useShopLocale();
  const logoSrc = originalImageSrc(logoUrl || "");
  return (
    // Gleicher Sandton wie der Header (Seitenmitte ist heller) — rahmt den
    // Shop ein und das rot-orange Logo bleibt gut sichtbar.
    <footer className="relative mt-auto bg-jmle-sand text-luxury-ink px-4 pb-8 pt-12 md:px-8 border-t border-orange-200/70">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 flex flex-col items-center gap-2">
          {logoSrc ? (
            <Link
              href="/"
              prefetch
              aria-label={`${siteName} – Home`}
              className="relative block h-28 w-48 md:h-32 md:w-56 transition-transform duration-300 hover:scale-[1.03]"
            >
              {/* Logo-Datei ist quadratisch mit viel Rand — object-cover schneidet nur Leerraum ab */}
              <Image
                src={logoSrc}
                alt={siteName}
                fill
                quality={SHOP_IMAGE_QUALITY}
                sizes="(max-width: 768px) 192px, 224px"
                className="object-cover"
                draggable={false}
              />
            </Link>
          ) : (
            <BrandMark
              logoUrl=""
              name={siteName}
              className="justify-center mx-auto"
              textClassName="text-brand-red hover:text-brand-orange !text-4xl md:!text-5xl"
            />
          )}
          <p className="text-luxury-ink/65 text-sm md:text-base font-ui max-w-md">
            {t("tagline")}
          </p>
          <div className="gold-divider !mb-0 !mt-2" aria-hidden />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm mb-10">
          <div>
            <h4 className={headingClass}>{t("footerShop")}</h4>
            <ul className="space-y-2.5 font-body">
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
            <h4 className={headingClass}>{t("footerAccount")}</h4>
            <ul className="space-y-2.5 font-body">
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
            <h4 className={headingClass}>{t("footerLegal")}</h4>
            <ul className="space-y-2.5 font-body">
              <li>
                <Link href="/legal/impressum" className={linkClass}>
                  {t("imprintLabel")}
                </Link>
              </li>
              <li>
                <Link href="/legal/datenschutz" className={linkClass}>
                  {t("privacyLabel")}
                </Link>
              </li>
              <li>
                <Link href="/legal/widerruf" className={linkClass}>
                  {t("withdrawalLabel")}
                </Link>
              </li>
              <li>
                <Link href="/legal/agb" className={linkClass}>
                  {t("termsLabel")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className={headingClass}>{t("footerContact")}</h4>
            <ul className="space-y-2.5 font-body">
              <li>
                <a href={`tel:${BUSINESS_INFO.telephone}`} dir="ltr" className={linkClass}>
                  {BUSINESS_INFO.telephoneDisplay}
                </a>
              </li>
              <li>
                <a href={`mailto:${BUSINESS_INFO.email}`} dir="ltr" className={linkClass}>
                  {BUSINESS_INFO.email}
                </a>
              </li>
              <li className="text-luxury-ink/75">
                {[BUSINESS_INFO.addressLocality, t("countryGermany")].filter(Boolean).join("، ")}
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-orange-200/70 pt-6 text-center text-xs text-luxury-ink/60 font-ui">
          <p>&copy; {new Date().getFullYear()} {siteName}. {t("rights")}</p>
        </div>
      </div>
    </footer>
  );
}
