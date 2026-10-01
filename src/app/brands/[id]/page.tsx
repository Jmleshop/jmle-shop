import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getBrandByIdAsync,
  getProductsByBrandAsync,
  getSiteConfigAsync,
} from "@/lib/catalog-server";
import { getAppUrl } from "@/lib/site-defaults";
import { ProductGrid } from "@/components/ProductCard";
import { ShopHeading } from "@/components/ShopText";
import ShopImage from "@/components/ShopImage";

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
    return { title: `Marke nicht gefunden — ${site.name}` };
  }

  const appUrl = getAppUrl();
  const url = `${appUrl}/brands/${brand.id}`;
  const title = `${brand.name} — ${site.name}`;
  const description = `Alle Produkte der Marke ${brand.name} bei ${site.name}`;

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
        ? [{ url: brand.image, width: 400, height: 200, alt: brand.name }]
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
        <div className="mx-auto mb-4 flex h-14 w-36 items-center justify-center rounded-xl bg-white/95 px-3 shadow-sm md:h-16 md:w-44">
          <ShopImage
            role="logo"
            src={brand.image}
            alt={brand.name}
            sizes="180px"
            frameClassName="relative h-10 w-full md:h-12"
          />
        </div>
        <h1 className="font-display text-2xl md:text-3xl tracking-wide">
          {brand.name}
        </h1>
        <ShopHeading
          as="p"
          k="productCount"
          vars={{ count: products.length }}
          className="mt-2 text-sm text-white/90 font-ui"
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
