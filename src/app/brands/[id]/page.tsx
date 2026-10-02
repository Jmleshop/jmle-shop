import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import {
  getBrandByIdAsync,
  getProductsByBrandAsync,
  getSiteConfigAsync,
} from "@/lib/catalog-server";
import { getAppUrl } from "@/lib/site-defaults";
import { ProductGrid } from "@/components/ProductCard";
import { ShopHeading } from "@/components/ShopText";
import { originalImageSrc, SHOP_IMAGE_QUALITY } from "@/lib/sharp-image";

export const revalidate = 60;

interface BrandPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: BrandPageProps): Promise<Metadata> {
  const { id } = await params;
  const decoded = decodeURIComponent(id);
  const [brand, site] = await Promise.all([
    getBrandByIdAsync(decoded),
    getSiteConfigAsync(),
  ]);

  if (!brand) {
    return { title: site.name };
  }

  const appUrl = getAppUrl();
  const url = `${appUrl}/brands/${encodeURIComponent(brand.id)}`;
  // Kein Markenname in Meta/OG — nur Logo + Shop-Name
  const title = site.name;
  const description = site.description || site.tagline || site.name;

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
      images: brand.image
        ? [{ url: brand.image, width: 400, height: 200, alt: site.name }]
        : undefined,
    },
  };
}

export default async function BrandPage({ params }: BrandPageProps) {
  const { id } = await params;
  const decoded = decodeURIComponent(id);
  const [brand, products] = await Promise.all([
    getBrandByIdAsync(decoded),
    getProductsByBrandAsync(decoded),
  ]);

  if (!brand) {
    notFound();
  }

  return (
    <div>
      <div className="bg-gradient-to-r from-gold to-jmle-orange-dark text-white py-10 px-4 text-center">
        <div className="mx-auto flex h-16 w-44 items-center justify-center rounded-xl bg-white/95 px-3 shadow-sm md:h-20 md:w-52">
          <div className="relative h-12 w-full md:h-14">
            <Image
              src={originalImageSrc(brand.image)}
              alt=""
              fill
              quality={SHOP_IMAGE_QUALITY}
              className="object-contain"
              sizes="200px"
              priority
            />
          </div>
        </div>
        <ShopHeading
          as="p"
          k="productCount"
          vars={{ count: products.length }}
          className="mt-4 text-sm text-white/90 font-ui"
        />
      </div>

      {products.length > 0 ? (
        <ProductGrid products={products} />
      ) : (
        <div className="max-w-lg mx-auto text-center py-16 px-4 text-luxury-charcoal">
          <ShopHeading as="p" k="brandEmpty" className="font-ui text-base" />
        </div>
      )}
    </div>
  );
}
