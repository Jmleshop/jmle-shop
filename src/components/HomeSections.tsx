"use client";

import { useShopLocale } from "@/components/ShopLocale";
import CompactBannerSlider from "@/components/CompactBannerSlider";
import { cn } from "@/lib/cn";
import type { Slide } from "@/types";

/** Optionale Sektions-Überschrift — leer = kein Abstand */
export function OptionalSectionTitle({
  title,
  className,
}: {
  title?: string | null;
  className?: string;
}) {
  const text = (title ?? "").trim();
  if (!text) return null;
  return (
    <div className={cn("text-center px-4 pt-4 sm:pt-5 pb-2", className)}>
      <h2 className="section-title text-lg sm:text-xl md:text-2xl">{text}</h2>
    </div>
  );
}

export function BannerSection({
  slides,
  title,
  size = "compact",
}: {
  slides: Slide[];
  title?: string | null;
  size?: "hero" | "compact";
}) {
  if (!slides.length) return null;
  return (
    <div>
      {size !== "hero" ? <OptionalSectionTitle title={title} /> : null}
      <CompactBannerSlider slides={slides} size={size} />
    </div>
  );
}

export function EmptyCategoryNotice() {
  const { t } = useShopLocale();
  return (
    <p className="text-center text-gray-500 font-ui py-16 px-4">
      {t("noProducts")}
    </p>
  );
}
