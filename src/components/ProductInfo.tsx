"use client";

import { useRef } from "react";
import Link from "next/link";
import type { BrandLogo, Category, Product } from "@/types";
import { ProductPrice } from "@/components/ProductPrice";
import AddToCartButton from "@/components/AddToCartButton";
import ProductDetailExtras from "@/components/ProductDetailExtras";
import TrustBadges from "@/components/TrustBadges";
import StickyMobileAddToCart from "@/components/StickyMobileAddToCart";
import { useShopLocale } from "@/components/ShopLocale";
import { categoryTitle, localizedField, productTitle } from "@/lib/shop-i18n";
import { formatUnitPriceLabel } from "@/lib/pricing";
import { Accordion, OriginBadge, SealBadge, type AccordionItemData } from "@/components/ui";

function detectSeals(hay: string): Array<"halal" | "organic"> {
  const t = hay.toLowerCase();
  const out: Array<"halal" | "organic"> = [];
  if (/حلال|halal/.test(t)) out.push("halal");
  if (/عضوي|organic|\bbio\b/.test(t)) out.push("organic");
  return out;
}

export default function ProductInfo({
  product,
  category,
  brand,
}: {
  product: Product;
  category?: Category;
  brand?: BrandLogo | null;
}) {
  const { lang, t } = useShopLocale();
  const atcZoneRef = useRef<HTMLDivElement>(null);
  const title = productTitle(lang, product);
  const description = localizedField(lang, product.description);
  const ingredients = localizedField(lang, product.ingredients);
  const allergens = localizedField(lang, product.allergens);
  const out = product.stock <= 0;
  const unitPriceLabel = formatUnitPriceLabel(
    product.price,
    product.weightValue,
    product.weightUnit
  );
  const seals = detectSeals(
    `${product.name} ${product.nameDe ?? ""} ${product.description} ${product.ingredients ?? ""}`
  );
  const secondary =
    lang === "de"
      ? product.name !== title
        ? product.name
        : ""
      : product.nameDe && product.nameDe !== title
        ? product.nameDe
        : "";

  const accordionItems: AccordionItemData[] = [];
  if (description) {
    accordionItems.push({
      id: "desc",
      title: t("desc"),
      content: description,
      defaultOpen: true,
    });
  }
  if (ingredients) {
    accordionItems.push({
      id: "ingredients",
      title: t("ingredients"),
      content: ingredients,
    });
  }
  if (allergens) {
    accordionItems.push({
      id: "allergens",
      title: t("allergens"),
      content: allergens,
      defaultOpen: !description,
    });
  }
  if (product.weightValue != null || unitPriceLabel || product.bestBeforeNote) {
    const lines: string[] = [];
    if (product.weightValue != null) {
      lines.push(t("netWeight", { value: product.weightValue, unit: product.weightUnit ?? "" }));
    }
    if (unitPriceLabel) lines.push(t("basePrice", { value: unitPriceLabel }));
    if (product.bestBeforeNote) lines.push(t("bestBefore", { value: product.bestBeforeNote }));
    accordionItems.push({
      id: "legal",
      title: t("legalPack"),
      content: lines.join("\n"),
    });
  }

  return (
    <div className={`flex flex-col justify-center ${out ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {category && (
          <Link
            href={`/categories/${category.id}`}
            className="text-sm font-ui text-gold hover:text-gold-dark hover:underline w-fit"
          >
            {categoryTitle(lang, category)}
          </Link>
        )}
        {brand && (
          <Link
            href={`/brands/${encodeURIComponent(brand.id)}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-jmle-warm/50 px-3 py-1.5 text-sm font-ui text-luxury-ink hover:bg-jmle-warm hover:border-gold/40 transition-colors min-h-9"
            aria-label={t("brandViewAll", { brand: brand.name })}
          >
            <span className="text-xs text-gray-500">{t("brandLabel")}:</span>
            <span className="font-medium">{brand.name}</span>
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <OriginBadge country={product.originCountry} />
        {seals.map((s) => (
          <SealBadge key={s} type={s} />
        ))}
      </div>

      <h1 className="font-display text-3xl md:text-4xl text-luxury-ink mb-1 leading-snug">
        {title}
        {product.weightValue != null && (
          <span className="font-ui text-base font-normal text-gray-500 ms-2">
            {product.weightValue} {product.weightUnit}
          </span>
        )}
      </h1>
      {secondary && (
        <p className="text-sm text-gray-500 mb-4 font-ui" dir={lang === "de" ? "rtl" : "ltr"}>
          {secondary}
        </p>
      )}

      <div className="mb-2 rounded-2xl border border-orange-200/70 bg-gradient-to-br from-white to-jmle-warm/60 p-4 sm:p-5 shadow-gold-sm">
        <ProductPrice product={product} align="start" showUnitPrice size="lg" />
      </div>

      <div ref={atcZoneRef} className="my-6">
        <AddToCartButton
          productId={product.id}
          stock={product.stock}
          maxOrderQuantity={product.maxOrderQuantity}
          imageUrl={product.image}
        />
        <TrustBadges />
      </div>

      {accordionItems.length > 0 && <Accordion items={accordionItems} allowMultiple />}

      <ProductDetailExtras barcode={product.barcode} />

      <StickyMobileAddToCart product={product} observeRef={atcZoneRef} />
    </div>
  );
}
