"use client";

import type { Category } from "@/types";
import { useShopLocale } from "@/components/ShopLocale";
import { categoryTitle, type ShopMsgKey } from "@/lib/shop-i18n";

export function ShopHeading({
  k,
  className,
  as: Tag = "h1",
  vars,
}: {
  k: ShopMsgKey;
  className?: string;
  as?: "h1" | "h2" | "p";
  vars?: Record<string, string | number>;
}) {
  const { t } = useShopLocale();
  return <Tag className={className}>{t(k, vars)}</Tag>;
}

export function CategoryHeading({
  category,
  className,
  as: Tag = "h1",
}: {
  category: Pick<Category, "id" | "name" | "nameEn">;
  className?: string;
  as?: "h1" | "h2" | "span";
}) {
  const { lang } = useShopLocale();
  return <Tag className={className}>{categoryTitle(lang, category)}</Tag>;
}
