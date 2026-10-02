import type { Metadata } from "next";
import { getProductsAsync, getSiteConfigAsync } from "@/lib/catalog-server";
import { getAppUrl } from "@/lib/site-defaults";
import { ProductGrid } from "@/components/ProductCard";
import { ShopHeading } from "@/components/ShopText";
import JsonLd from "@/components/JsonLd";
import { collectionPageJsonLd } from "@/lib/seo-jsonld";

// Immer serverseitig frisch: neu importierte Produkte sind sofort sichtbar.
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteConfigAsync();
  const appUrl = getAppUrl();
  const title = `Alle Produkte — arabische Lebensmittel | ${site.name}`;
  const description = `Alle Produkte von ${site.name}: arabische Lebensmittel, Falafel, Gewürze, Reis, Öle und Feinkost online entdecken.`;

  return {
    title,
    description,
    keywords: [
      "arabische Lebensmittel",
      "Alle Produkte",
      "Falafel",
      "Gewürze",
      site.name,
    ],
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
  const [products, site] = await Promise.all([
    getProductsAsync(),
    getSiteConfigAsync(),
  ]);

  return (
    <div>
      <JsonLd
        data={collectionPageJsonLd({
          name: `Alle Produkte — ${site.name}`,
          description: `Arabische Lebensmittel und Feinkost bei ${site.name}`,
          path: "/products",
          products,
        })}
      />
      <div className="bg-gradient-to-r from-gold to-jmle-orange-dark text-white py-10 px-4 text-center">
        <ShopHeading k="allProducts" className="font-display text-2xl md:text-3xl tracking-wide" />
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
          <ShopHeading as="p" k="noProducts" className="font-ui text-base" />
        </div>
      )}
    </div>
  );
}
