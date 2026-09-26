"use client";

import Link from "next/link";
import type { Category, Product } from "@/types";
import { ProductPrice } from "@/components/ProductPrice";
import AddToCartButton from "@/components/AddToCartButton";
import ProductDetailExtras from "@/components/ProductDetailExtras";
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
}: {
  product: Product;
  category?: Category;
}) {
  const { lang, t } = useShopLocale();
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
      {category && (
        <Link
          href={`/categories/${category.id}`}
          className="text-sm font-ui text-gold hover:text-gold-dark hover:underline mb-2 w-fit"
        >
          {categoryTitle(lang, category)}
        </Link>
      )}

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

      <div className="mb-2 rounded-2xl border border-amber-200/50 bg-white/70 p-4">
        <ProductPrice product={product} align="start" showUnitPrice />
      </div>

      <div className="my-6">
        <AddToCartButton
          productId={product.id}
          stock={product.stock}
          maxOrderQuantity={product.maxOrderQuantity}
        />
      </div>

      {accordionItems.length > 0 && <Accordion items={accordionItems} allowMultiple />}

      <ProductDetailExtras barcode={product.barcode} />
    </div>
  );
}
