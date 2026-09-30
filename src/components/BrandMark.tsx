"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { originalImageSrc } from "@/lib/sharp-image";

type BrandMarkProps = {
  logoUrl?: string | null;
  name?: string;
  className?: string;
  /** Text-Fallback-Klassen wenn kein Logo */
  textClassName?: string;
  /** Bildhöhe in px (CSS) */
  heightClassName?: string;
  priority?: boolean;
};

/**
 * Markenlogo als Home-Link. Ohne Logo-URL: Text-Marke.
 */
export default function BrandMark({
  logoUrl,
  name = "jmle",
  className,
  textClassName,
  /** Desktop ~48–50px, Mobile ~44px — nie Briefmarken-Größe */
  heightClassName = "h-11 lg:h-12",
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
        <span className={cn("relative block w-auto max-w-[14rem] sm:max-w-[16rem] lg:max-w-[18rem]", heightClassName)}>
          <Image
            src={src}
            alt={name}
            width={480}
            height={128}
            priority={priority}
            unoptimized
            quality={100}
            className={cn("h-full w-auto max-h-full object-contain object-center")}
            sizes="(max-width: 640px) 220px, (max-width: 1024px) 260px, 320px"
          />
        </span>
      ) : (
        <span
          className={cn(
            "font-display tracking-[0.08em] leading-none transition-colors text-[2.5rem] lg:text-[3rem]",
            textClassName || "text-brand-orange hover:text-brand-red"
          )}
        >
          {name}
        </span>
      )}
    </Link>
  );
}
