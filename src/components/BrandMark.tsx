"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { originalImageSrc, SHOP_IMAGE_QUALITY } from "@/lib/sharp-image";

type BrandMarkProps = {
  logoUrl?: string | null;
  name?: string;
  className?: string;
  /** Text-Fallback-Klassen wenn kein Logo (Farbe o. Ä.) */
  textClassName?: string;
  /** Optionaler Höhen-Override via `.brand-mark-frame` */
  heightClassName?: string;
  priority?: boolean;
};

/**
 * Markenlogo als Home-Link (`/`). Via next/image → Vercel CDN (kein Direkt-Egress).
 */
export default function BrandMark({
  logoUrl,
  name = "jmle",
  className,
  textClassName,
  heightClassName,
  priority,
}: BrandMarkProps) {
  const src = originalImageSrc(logoUrl || "");
  return (
    <Link
      href="/"
      prefetch
      className={cn(
        "relative z-20 inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center pointer-events-auto transition-opacity hover:opacity-90",
        className
      )}
      aria-label={`${name} – Home`}
    >
      {src ? (
        <span className={cn("brand-mark-frame", heightClassName)}>
          <Image
            src={src}
            alt={name}
            width={220}
            height={80}
            quality={SHOP_IMAGE_QUALITY}
            priority={priority}
            sizes="(max-width: 1024px) 120px, 176px"
            className="brand-mark-img h-full w-auto max-w-full object-contain"
            draggable={false}
          />
        </span>
      ) : (
        <span
          className={cn(
            "font-display brand-mark-text transition-colors",
            textClassName || "text-brand-orange hover:text-brand-red"
          )}
        >
          {name}
        </span>
      )}
    </Link>
  );
}
