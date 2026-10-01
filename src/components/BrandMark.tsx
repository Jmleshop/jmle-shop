"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import ShopImage from "@/components/ShopImage";
import { originalImageSrc } from "@/lib/sharp-image";

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
 * Markenlogo als Home-Link (`/`). Policy-Rolle `logo` (contain, transparent).
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
        <ShopImage
          role="logo"
          src={src}
          alt={name}
          sizes="180px"
          priority={priority}
          frameClassName={cn("brand-mark-frame", heightClassName)}
          mediaClassName="brand-mark-img"
        />
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
