import type { Metadata } from "next";
import {
  getBrandLogosAsync,
  getCategoriesAsync,
  getSiteConfigAsync,
  queryPublicCatalogAsync,
} from "@/lib/catalog-server";
import { parseCatalogFilters } from "@/lib/catalog-filters";
import { getAppUrl } from "@/lib/site-defaults";
import CatalogShop from "@/components/CatalogShop";
import JsonLd from "@/components/JsonLd";
import { collectionPageJsonLd } from "@/lib/seo-jsonld";

export const revalidate = 60;

interface ShopPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  searchParams,
}: ShopPageProps): Promise<Metadata> {
  const params = await searchParams;
  const filters = parseCatalogFilters(params);
  const site = await getSiteConfigAsync();
  const appUrl = getAppUrl();
  const q = filters.q;
  const title = q
    ? `نتائج البحث: ${q} — ${site.name}`
    : `المتجر — جميع المنتجات | ${site.name}`;
  const description = q
    ? `نتائج البحث عن «${q}» في متجر ${site.name}`
    : `جميع منتجات ${site.name}: مواد غذائية عربية، بهارات، أرز، زيوت والمزيد.`;

  return {
    title,
    description,
    alternates: { canonical: `${appUrl}/shop` },
    openGraph: {
      type: "website",
      locale: "ar_DE",
      url: `${appUrl}/shop`,
      siteName: site.name,
      title,
      description,
    },
    robots: q ? { index: false, follow: true } : undefined,
  };
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  const filters = parseCatalogFilters(params);
  const [result, categories, brands, site] = await Promise.all([
    queryPublicCatalogAsync(filters, { lang: "ar" }),
    getCategoriesAsync(),
    getBrandLogosAsync(),
    getSiteConfigAsync(),
  ]);

  return (
    <div>
      <JsonLd
        data={collectionPageJsonLd({
          name: `المتجر — ${site.name}`,
          description: `Arabische Lebensmittel und Feinkost bei ${site.name}`,
          path: "/shop",
          products: result.products,
        })}
      />
      <div className="bg-gradient-to-r from-gold to-jmle-orange-dark text-white py-8 px-4 text-center">
        <h1 className="font-display text-2xl md:text-3xl tracking-wide">
          {site.name}
        </h1>
        <p className="mt-2 text-sm text-white/90 font-ui">
          {filters.q
            ? `${result.total} · «${filters.q}»`
            : `${result.total}`}
        </p>
      </div>
      <CatalogShop
        products={result.products}
        total={result.total}
        page={result.page}
        pageCount={result.pageCount}
        categories={categories}
        brands={brands}
        headingKey={filters.q ? "searchResults" : "allProducts"}
        headingVars={filters.q ? { query: filters.q } : undefined}
      />
    </div>
  );
}
