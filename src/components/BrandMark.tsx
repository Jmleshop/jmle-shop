"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { originalImageSrc, SHOP_IMAGE_QUALITY } from "@/lib/sharp-image";

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
  heightClassName = "h-9 sm:h-10",
  priority,
}: BrandMarkProps) {
  const src = originalImageSrc(logoUrl || "");
  return (
    <Link
      href="/"
      className={cn(
        "cursor-pointer inline-flex items-center justify-center shrink-0 transition-opacity hover:opacity-90",
        className
      )}
      aria-label={name}
    >
      {src ? (
        <span className={cn("relative block w-auto", heightClassName)}>
          <Image
            src={src}
            alt={name}
            width={180}
            height={48}
            priority={priority}
            quality={SHOP_IMAGE_QUALITY}
            className={cn("h-full w-auto max-w-[10rem] object-contain object-center")}
            sizes="(max-width: 640px) 120px, 180px"
          />
        </span>
      ) : (
        <span
          className={cn(
            "font-display tracking-[0.2em] transition-colors",
            textClassName ||
              "text-brand-orange hover:text-brand-red"
          )}
        >
          {name}
        </span>
      )}
    </Link>
  );
}
