import type { Metadata } from "next";
import { getProductsAsync, getSiteConfigAsync } from "@/lib/catalog-server";
import { getAppUrl } from "@/lib/site-defaults";
import { ProductGrid } from "@/components/ProductCard";

// Immer serverseitig frisch: neu importierte Produkte sind sofort sichtbar.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteConfigAsync();
  const appUrl = getAppUrl();
  const title = `جميع المنتجات — ${site.name}`;
  const description = "تصفّح جميع منتجات متجر jmle في مكان واحد.";

  return {
    title,
    description,
    alternates: { canonical: `${appUrl}/products` },
    openGraph: {
      type: "website",
      locale: "ar_DE",
      url: `${appUrl}/products`,
      siteName: site.name,
      title,
      description,
    },
  };
}

export default async function AllProductsPage() {
  const products = await getProductsAsync();

  return (
    <div>
      <div className="bg-gradient-to-r from-gold to-jmle-orange-dark text-white py-10 px-4 text-center">
        <h1 className="font-display text-2xl md:text-3xl tracking-wide">
          جميع المنتجات
        </h1>
        <p className="mt-2 text-sm text-white/90 font-ui">
          {products.length} منتج
        </p>
      </div>

      {products.length > 0 ? (
        <ProductGrid products={products} />
      ) : (
        <div className="max-w-lg mx-auto text-center py-16 px-4 text-luxury-charcoal">
          <p className="font-ui text-base">
            لا توجد منتجات لعرضها حالياً.
          </p>
        </div>
      )}
    </div>
  );
}
