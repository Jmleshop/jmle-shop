"use client";

import { useShopLocale } from "@/components/ShopLocale";
import { useAutoTranslate } from "@/hooks/useAutoTranslate";

/** Produkttitel mit Auto-Übersetzung wenn die Zielsprache fehlt. */
export function LocalizedProductTitle({
  nameAr,
  nameDe,
  className,
  as: Tag = "span",
}: {
  nameAr: string;
  nameDe?: string | null;
  className?: string;
  as?: "span" | "h1" | "h2" | "h3" | "p";
}) {
  const { lang } = useShopLocale();
  const preferred = lang === "de" ? nameDe : nameAr;
  const fallback = lang === "de" ? nameAr : nameDe;
  const text = useAutoTranslate(lang, preferred, fallback);
  return <Tag className={className}>{text}</Tag>;
}

export function LocalizedCategoryTitle({
  nameAr,
  nameDe,
  className,
  as: Tag = "span",
}: {
  nameAr: string;
  nameDe?: string | null;
  className?: string;
  as?: "span" | "h1" | "h2" | "h3" | "p";
}) {
  const { lang } = useShopLocale();
  const preferred = lang === "de" ? nameDe : nameAr;
  const fallback = lang === "de" ? nameAr : nameDe;
  const text = useAutoTranslate(lang, preferred, fallback);
  return <Tag className={className}>{text}</Tag>;
}
