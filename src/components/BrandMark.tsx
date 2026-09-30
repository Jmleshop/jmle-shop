"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { originalImageSrc } from "@/lib/sharp-image";

type BrandMarkProps = {
  logoUrl?: string | null;
  name?: string;
  className?: string;
  /** Text-Fallback-Klassen wenn kein Logo (Farbe o. Ä.) */
  textClassName?: string;
  /**
   * Optionaler Höhen-Override. Standard: 44px Mobile / 50px Desktop
   * via `.brand-mark-frame` — nie Briefmarken-Größe.
   */
  heightClassName?: string;
  priority?: boolean;
};

/**
 * Markenlogo als Home-Link. Ohne Logo-URL: Text-Marke in voller Header-Größe.
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
        "relative z-20 cursor-pointer inline-flex items-center justify-center shrink-0 min-h-11 transition-opacity hover:opacity-90 pointer-events-auto",
        className
      )}
      aria-label={`${name} – Home`}
    >
      {src ? (
        <span className={cn("brand-mark-frame relative", heightClassName)}>
          <Image
            src={src}
            alt={name}
            width={480}
            height={128}
            priority={priority}
            unoptimized
            quality={100}
            className="brand-mark-img"
            sizes="(max-width: 640px) 220px, (max-width: 1024px) 260px, 320px"
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
