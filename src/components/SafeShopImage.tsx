"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";
import { originalImageSrc, SHOP_IMAGE_QUALITY } from "@/lib/sharp-image";

const PLACEHOLDER = "/placeholder.svg";

type SafeShopImageProps = Omit<ImageProps, "src" | "onError" | "quality"> & {
  src: string | null | undefined;
  quality?: number;
};

/**
 * next/image wrapper with placeholder fallback for missing/broken assets.
 * Preserves object-fit classes from the caller (product contain / banner cover).
 */
export default function SafeShopImage({
  src,
  alt,
  quality = SHOP_IMAGE_QUALITY,
  ...rest
}: SafeShopImageProps) {
  const initial = originalImageSrc(src || "") || PLACEHOLDER;
  const [current, setCurrent] = useState(initial);

  return (
    <Image
      {...rest}
      alt={alt}
      src={current}
      quality={quality}
      onError={() => {
        if (current !== PLACEHOLDER) setCurrent(PLACEHOLDER);
      }}
    />
  );
}
