"use client";

import Image from "next/image";
import Link from "next/link";
import type { BrandLogo } from "@/types";
import { originalImageSrc, SHOP_IMAGE_QUALITY } from "@/lib/sharp-image";
import { useShopLocale } from "@/components/ShopLocale";
import { cn } from "@/lib/cn";

interface BrandLogoTickerProps {
  logos: BrandLogo[];
  className?: string;
}

function LogoItem({ logo }: { logo: BrandLogo }) {
  const img = (
    <div className="relative h-10 sm:h-12 md:h-14 w-28 sm:w-32 md:w-36 shrink-0 grayscale hover:grayscale-0 opacity-80 hover:opacity-100 transition-all duration-300">
      <Image
        src={originalImageSrc(logo.image)}
        alt={logo.name || "Brand"}
        fill
        unoptimized
        quality={SHOP_IMAGE_QUALITY}
        className="object-contain"
        sizes="144px"
      />
    </div>
  );

  if (logo.linkUrl) {
    const external = logo.linkUrl.startsWith("http");
    return (
      <Link
        href={logo.linkUrl}
        className="px-4 sm:px-6"
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {img}
      </Link>
    );
  }

  return <div className="px-4 sm:px-6">{img}</div>;
}

export default function BrandLogoTicker({ logos, className }: BrandLogoTickerProps) {
  const { t } = useShopLocale();
  if (!logos.length) return null;

  const loop = logos.length === 1 ? logos : [...logos, ...logos];
  const duration = Math.max(18, logos.length * 4);

  return (
    <section
      className={cn(
        "py-3 sm:py-4 border-y border-orange-100/80 bg-white/70",
        className
      )}
      aria-label={t("brandPartners")}
    >
      <div
        className="jmle-marquee overflow-hidden"
        style={{ ["--marquee-duration" as string]: `${duration}s` }}
      >
        <div className="jmle-marquee-track items-center gap-2">
          {loop.map((logo, i) => (
            <LogoItem key={`${logo.id}-${i}`} logo={logo} />
          ))}
        </div>
      </div>
    </section>
  );
}
