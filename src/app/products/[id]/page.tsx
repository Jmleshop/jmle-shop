import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getCategoryByIdAsync,
  getProductByIdAsync,
  getSiteConfigAsync,
} from "@/lib/catalog-server";
import { getAppUrl } from "@/lib/site-defaults";
import { ProductPrice, StockBadge } from "@/components/ProductPrice";
import AddToCartButton from "@/components/AddToCartButton";
import ProductGallery from "@/components/ProductGallery";

export const dynamic = "force-dynamic";
import ProductDetailExtras from "@/components/ProductDetailExtras";
import WishlistButton from "@/components/WishlistButton";
import { formatUnitPriceLabel } from "@/lib/pricing";
import {
  Accordion,
  DiscountBadge,
  OriginBadge,
  SealBadge,
  type AccordionItemData,
} from "@/components/ui";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const [product, site] = await Promise.all([
    getProductByIdAsync(id),
    getSiteConfigAsync(),
  ]);

  if (!product) {
    return { title: `منتج غير موجود — ${site.name}` };
  }

  const appUrl = getAppUrl();
  const url = `${appUrl}/products/${product.id}`;
  const title = `${product.name} — ${site.name}`;
  const description =
    product.description?.slice(0, 160) ||
    `${product.name}${product.nameDe ? ` / ${product.nameDe}` : ""} من متجر ${site.name}`;
  const image = product.images[0] || product.image;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "ar_DE",
      url,
      siteName: site.name,
      title,
      description,
      images: [
        {
          url: image,
          width: 800,
          height: 800,
          alt: product.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

function detectSeals(hay: string): Array<"halal" | "organic"> {
  const t = hay.toLowerCase();
  const out: Array<"halal" | "organic"> = [];
  if (/حلال|halal/.test(t)) out.push("halal");
  if (/عضوي|organic|\bbio\b/.test(t)) out.push("organic");
  return out;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = await getProductByIdAsync(id);

  if (!product) {
    notFound();
  }

  const category = product.categoryId
    ? await getCategoryByIdAsync(product.categoryId)
    : undefined;
  const out = product.stock <= 0;
  const unitPriceLabel = formatUnitPriceLabel(
    product.price,
    product.weightValue,
    product.weightUnit
  );
  const seals = detectSeals(
    `${product.name} ${product.nameDe ?? ""} ${product.description} ${product.ingredients ?? ""}`
  );

  const accordionItems: AccordionItemData[] = [];
  if (product.description) {
    accordionItems.push({
      id: "desc",
      title: "الوصف / Beschreibung",
      content: product.description,
      defaultOpen: true,
    });
  }
  if (product.ingredients) {
    accordionItems.push({
      id: "ingredients",
      title: "المكونات / Zutaten",
      content: product.ingredients,
    });
  }
  if (product.allergens) {
    accordionItems.push({
      id: "allergens",
      title: "مسببات الحساسية / Allergene (LMIV)",
      content: product.allergens,
      defaultOpen: !product.description,
    });
  }
  if (product.weightValue != null || unitPriceLabel || product.bestBeforeNote) {
    const lines: string[] = [];
    if (product.weightValue != null) {
      lines.push(`صافي الوزن / Nettofüllmenge: ${product.weightValue} ${product.weightUnit}`);
    }
    if (unitPriceLabel) {
      lines.push(`Grundpreis: ${unitPriceLabel}`);
    }
    if (product.bestBeforeNote) {
      lines.push(`Mindesthaltbarkeit: ${product.bestBeforeNote}`);
    }
    accordionItems.push({
      id: "legal",
      title: "التعبئة والسعر الأساسي / Füllmenge & Grundpreis",
      content: lines.join("\n"),
    });
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 animate-fade-up">
      <div className="grid md:grid-cols-2 gap-8 md:gap-12">
        <div className="relative">
          <div className="absolute top-3 start-3 z-10 flex flex-col gap-1.5">
            <StockBadge stock={product.stock} />
            <DiscountBadge percent={product.discountPercent} />
          </div>
          <div className="absolute top-3 end-3 z-10">
            <WishlistButton productId={product.id} size="lg" />
          </div>
          <ProductGallery
            images={product.images}
            alt={product.name}
            dimmed={out}
          />
        </div>

        <div className={`flex flex-col justify-center ${out ? "opacity-60" : ""}`}>
          {category && (
            <Link
              href={`/categories/${category.id}`}
              className="text-sm font-ui text-gold hover:text-gold-dark hover:underline mb-2 w-fit"
            >
              {category.name}
            </Link>
          )}

          <div className="flex flex-wrap gap-1.5 mb-3">
            <OriginBadge country={product.originCountry} />
            {seals.map((s) => (
              <SealBadge key={s} type={s} />
            ))}
          </div>

          <h1 className="font-display text-3xl md:text-4xl text-luxury-ink mb-1 leading-snug">
            {product.name}
            {product.weightValue != null && (
              <span className="font-ui text-base font-normal text-gray-500 ms-2">
                {product.weightValue} {product.weightUnit}
              </span>
            )}
          </h1>
          {product.nameDe && product.nameDe !== product.name && (
            <p className="text-sm text-gray-500 mb-4 font-ui" dir="ltr">
              {product.nameDe}
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

          {accordionItems.length > 0 && (
            <Accordion items={accordionItems} allowMultiple />
          )}

          <ProductDetailExtras barcode={product.barcode} />
        </div>
      </div>
    </div>
  );
}
