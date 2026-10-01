import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getCategoryByIdAsync,
  getProductByIdAsync,
  getSiteConfigAsync,
} from "@/lib/catalog-server";
import { getAppUrl } from "@/lib/site-defaults";
import { StockBadge } from "@/components/ProductPrice";
import ProductGallery from "@/components/ProductGallery";
import ProductInfo from "@/components/ProductInfo";
import WishlistButton from "@/components/WishlistButton";
import { DiscountBadge } from "@/components/ui";

export const revalidate = 60;

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

        <ProductInfo product={product} category={category} />
      </div>
    </div>
  );
}
