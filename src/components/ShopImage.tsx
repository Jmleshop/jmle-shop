"use client";

import Image from "next/image";
import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  type ImageRole,
  policyForRole,
} from "@/lib/image-policy";
import { originalImageSrc } from "@/lib/sharp-image";

type ShopImageProps = {
  role: ImageRole;
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  frameClassName?: string;
  mediaClassName?: string;
  /** Skip Next optimizer (cart/wishlist thumbs, admin). */
  unoptimized?: boolean;
  /** Banner may use intrinsic width/height instead of fill. */
  width?: number;
  height?: number;
  /** Default true for product/category/logo; banner uses width/height. */
  fill?: boolean;
  draggable?: boolean;
  /** Overlays inside the frame (badges, wishlist, etc.) */
  children?: ReactNode;
};

/**
 * Einheitliche Storefront-/Admin-Bildanzeige laut `image-policy`.
 */
const ShopImage = forwardRef<HTMLDivElement, ShopImageProps>(function ShopImage(
  {
    role,
    src,
    alt,
    sizes,
    priority,
    className,
    frameClassName,
    mediaClassName,
    unoptimized,
    width,
    height,
    fill,
    draggable = false,
    children,
  },
  ref
) {
  const policy = policyForRole(role);
  const resolved = originalImageSrc(src);
  const useFill = fill ?? (role === "product" || role === "category" || role === "logo");

  if (role === "logo") {
    return (
      <div
        ref={ref}
        className={cn(
          policy.frameClass,
          "relative inline-flex items-center justify-center",
          frameClassName,
          className
        )}
      >
        {/* Native img: keine Next-Resize-Artefakte, Aspekt bleibt erhalten */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolved}
          alt={alt}
          className={cn(
            policy.mediaClass,
            "brand-mark-img h-full w-full object-contain",
            mediaClassName
          )}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          draggable={draggable}
        />
        {children}
      </div>
    );
  }

  if (role === "banner" || !useFill) {
    return (
      <div ref={ref} className={cn(policy.frameClass, frameClassName, className)}>
        <Image
          src={resolved}
          alt={alt}
          width={width ?? 1920}
          height={height ?? 800}
          quality={policy.displayQuality}
          priority={priority}
          className={cn(policy.mediaClass, mediaClassName)}
          sizes={sizes}
          unoptimized={unoptimized}
          draggable={draggable}
        />
        {children}
      </div>
    );
  }

  return (
    <div ref={ref} className={cn(policy.frameClass, frameClassName, className)}>
      <Image
        src={resolved}
        alt={alt}
        fill
        quality={policy.displayQuality}
        priority={priority}
        className={cn(policy.mediaClass, mediaClassName)}
        sizes={sizes}
        unoptimized={unoptimized}
        draggable={draggable}
      />
      {children}
    </div>
  );
});

export default ShopImage;
