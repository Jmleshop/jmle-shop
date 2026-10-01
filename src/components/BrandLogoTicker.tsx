"use client";

import Link from "next/link";
import type { BrandLogo } from "@/types";
import ShopImage from "@/components/ShopImage";
import { useShopLocale } from "@/components/ShopLocale";
import { cn } from "@/lib/cn";

interface BrandLogoTickerProps {
  logos: BrandLogo[];
  className?: string;
  /** Optionale Überschrift — leer = kein Abstand/kein Titel */
  title?: string;
}

function brandHref(logo: BrandLogo): string {
  const custom = (logo.linkUrl || "").trim();
  if (custom.startsWith("http://") || custom.startsWith("https://")) return custom;
  if (custom.startsWith("/") && custom !== "/") return custom;
  return `/brands/${encodeURIComponent(logo.id)}`;
}

function LogoItem({ logo }: { logo: BrandLogo }) {
  const href = brandHref(logo);
  const external = href.startsWith("http");
  const img = (
    <ShopImage
      role="logo"
      src={logo.image}
      alt={logo.name || "Brand"}
      sizes="(max-width: 768px) 80px, 112px"
      frameClassName="h-10 md:h-14 w-20 md:w-28 shrink-0 opacity-90 transition-opacity hover:opacity-100"
    />
  );

  return (
    <Link
      href={href}
      className="px-3 md:px-4"
      aria-label={logo.name || "Marke"}
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
  if (!logos.length) return null;

  const heading = (title ?? "").trim();
  const loop = logos.length === 1 ? logos : [...logos, ...logos];
  const duration = Math.max(18, logos.length * 4);

  return (
    <section
      className={cn(heading ? "pt-3 sm:pt-4 pb-2 sm:pb-3" : "py-2 sm:py-3", className)}
      aria-label={heading || t("brandPartners")}
    >
      {heading ? (
        <div className="text-center mb-2 sm:mb-3 px-4">
          <h2 className="section-title text-base sm:text-lg">{heading}</h2>
        </div>
      ) : null}
      <div
        className="jmle-marquee overflow-hidden bg-transparent"
        style={{ ["--marquee-duration" as string]: `${duration}s` }}
      >
        <div className="jmle-marquee-track items-center gap-1 md:gap-2">
          {loop.map((logo, i) => (
            <LogoItem key={`${logo.id}-${i}`} logo={logo} />
          ))}
        </div>
      </div>
    </section>
  );
}
