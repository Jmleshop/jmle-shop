import type { Metadata } from "next";
import { Suspense } from "react";
import { getProductsPageAsync, getSiteConfigAsync, type ProductSort } from "@/lib/catalog-server";
import { pageFromSearchParam } from "@/lib/pagination";
import { getAppUrl } from "@/lib/site-defaults";
import { ProductGrid } from "@/components/ProductCard";
import ProductPagination from "@/components/ProductPagination";
import ProductCatalogControls from "@/components/ProductCatalogControls";
import { ShopHeading } from "@/components/ShopText";

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

const SORTS = new Set<ProductSort>(["popular", "price_asc", "price_desc", "newest"]);

function num(value?: string) {
  if (value == null || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export default async function AllProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    sort?: string;
    min?: string;
    max?: string;
    sale?: string;
    stock?: string;
  }>;
}) {
  const sp = await searchParams;
  const sort = SORTS.has(sp.sort as ProductSort) ? (sp.sort as ProductSort) : "popular";
  const { products, total, page, pages } = await getProductsPageAsync(
    pageFromSearchParam(sp.page),
    {
      sort,
      min: num(sp.min),
      max: num(sp.max),
      sale: sp.sale === "1",
      inStock: sp.stock === "1",
    }
  );
  const query = {
    sort: sort === "popular" ? undefined : sort,
    min: sp.min || undefined,
    max: sp.max || undefined,
    sale: sp.sale === "1" ? "1" : undefined,
    stock: sp.stock === "1" ? "1" : undefined,
  };

  return (
    <div>
      <div className="bg-gradient-to-r from-gold to-jmle-orange-dark text-white py-10 px-4 text-center">
        <ShopHeading k="allProducts" className="font-display text-2xl md:text-3xl tracking-wide" />
        <ShopHeading
          as="p"
          k="productCount"
          vars={{ count: total }}
          className="mt-2 text-sm text-white/90 font-ui"
        />
      </div>

      <Suspense fallback={null}>
        <ProductCatalogControls>
          {products.length > 0 ? (
            <>
              <ProductGrid products={products} />
              <ProductPagination page={page} pages={pages} href="/products" query={query} />
            </>
          ) : (
            <div className="mx-auto max-w-lg py-16 text-center text-luxury-charcoal">
              <ShopHeading as="p" k="noProducts" className="font-ui text-base" />
            </div>
          )}
        </ProductCatalogControls>
      </Suspense>
    </div>
  );
}
