"use client";

import Image from "next/image";
import Link from "next/link";
import type { BrandLogo } from "@/types";
import { originalImageSrc, SHOP_IMAGE_QUALITY } from "@/lib/sharp-image";
import { useShopLocale } from "@/components/ShopLocale";
import { cn } from "@/lib/cn";
import ScrollCarousel from "@/components/ScrollCarousel";
import { hasBrandLogo } from "@/lib/brand-link";

interface BrandLogoTickerProps {
  logos: BrandLogo[];
  className?: string;
  /** Optionale Überschrift — leer = kein Abstand/kein Titel */
  title?: string;
}

/** Kundenansicht: immer zur Marken-Produktseite — Name bleibt intern. */
function brandHref(logo: BrandLogo): string {
  const custom = (logo.linkUrl || "").trim();
  if (custom.startsWith("http://") || custom.startsWith("https://")) return custom;
  return `/brands/${encodeURIComponent(logo.id)}`;
}

function LogoItem({ logo }: { logo: BrandLogo }) {
  const { t } = useShopLocale();
  const href = brandHref(logo);
  const external = href.startsWith("http");
  const img = (
    <div className="layout-brands-logo relative shrink-0 opacity-90 transition-opacity hover:opacity-100">
      <Image
        src={originalImageSrc(logo.image)}
        alt=""
        fill
        quality={SHOP_IMAGE_QUALITY}
        className="object-contain"
        sizes="(max-width: 768px) 80px, 112px"
      />
    </div>
  );

  return (
    <Link
      href={href}
      className="layout-brands-item shrink-0 snap-start py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange rounded-lg"
      aria-label={
        logo.name
          ? t("brandViewAll", { brand: logo.name })
          : t("brandPartners")
      }
      title={logo.name || undefined}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {img}
    </Link>
  );
}

export default function BrandLogoTicker({
  logos,
  className,
  title,
}: BrandLogoTickerProps) {
  const { t } = useShopLocale();
  // Marken ohne Logo-Bild würden nur als Platzhalter-Punkt erscheinen
  const withImage = logos.filter((logo) => hasBrandLogo(logo.image));
  if (!withImage.length) return null;

  const heading = (title ?? "").trim();

  return (
    <section
      data-home-section="brands"
      className={cn("layout-brands-frame", className)}
    >
      {heading ? (
        <div className="layout-section-title-wrap mb-2 sm:mb-3 px-4">
          <h2 className="section-title text-base sm:text-lg">{heading}</h2>
        </div>
      ) : null}
      <ScrollCarousel
        label={heading || t("brandPartners")}
        speed={28}
        trackClassName="items-center [gap:var(--layout-brands-gap,0.25rem)] px-2 md:px-12"
      >
        {withImage.map((logo) => (
          <LogoItem key={logo.id} logo={logo} />
        ))}
      </ScrollCarousel>
    </section>
  );
}
