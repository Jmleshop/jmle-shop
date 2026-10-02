import { BUSINESS_INFO } from "@/lib/business-info";
import { discountedPrice } from "@/lib/pricing";
import { getAppUrl } from "@/lib/site-defaults";
import type { Category, Product, SiteConfig } from "@/types";

type JsonLd = Record<string, unknown>;

export function localBusinessJsonLd(site: SiteConfig): JsonLd {
  const appUrl = getAppUrl();
  const logo = site.logo || site.ogImage;
  const data: JsonLd = {
    "@context": "https://schema.org",
    "@type": "GroceryStore",
    "@id": `${appUrl}/#organization`,
    name: site.name || BUSINESS_INFO.legalName,
    description:
      site.description ||
      "Arabische Lebensmittel, Gewürze und Feinkost — jmle Onlineshop",
    url: appUrl,
    email: BUSINESS_INFO.email,
    telephone: BUSINESS_INFO.telephone,
    priceRange: BUSINESS_INFO.priceRange,
    currenciesAccepted: site.currency || "EUR",
    paymentAccepted: "Credit Card, Debit Card, Stripe",
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS_INFO.streetAddress,
      postalCode: BUSINESS_INFO.postalCode,
      addressLocality: BUSINESS_INFO.addressLocality,
      addressCountry: BUSINESS_INFO.addressCountry,
    },
    openingHours: [...BUSINESS_INFO.openingHours],
    areaServed: {
      "@type": "Country",
      name: "Germany",
    },
    knowsLanguage: ["ar", "de"],
  };
  if (logo) {
    data.logo = logo;
    data.image = logo;
  }
  if (BUSINESS_INFO.sameAs.length) {
    data.sameAs = [...BUSINESS_INFO.sameAs];
  }
  if (BUSINESS_INFO.geo) {
    data.geo = {
      "@type": "GeoCoordinates",
      latitude: BUSINESS_INFO.geo.latitude,
      longitude: BUSINESS_INFO.geo.longitude,
    };
  }
  return data;
}

export function productJsonLd(
  product: Product,
  opts?: {
    siteName?: string;
    categoryName?: string;
    /** Nur echte Bewertungen — keine Fake-Ratings */
    rating?: { value: number; count: number } | null;
  }
): JsonLd {
  const appUrl = getAppUrl();
  const url = `${appUrl}/products/${product.id}`;
  const images = (product.images?.length ? product.images : [product.image]).filter(
    Boolean
  );
  const price = discountedPrice(product.price, product.discountPercent);
  const availability =
    product.stock > 0
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock";

  const offer: JsonLd = {
    "@type": "Offer",
    url,
    priceCurrency: "EUR",
    price: price.toFixed(2),
    availability,
    itemCondition: "https://schema.org/NewCondition",
    seller: {
      "@type": "Organization",
      name: opts?.siteName || "jmle",
    },
  };

  const data: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.nameDe
      ? `${product.name} / ${product.nameDe}`
      : product.name,
    description:
      product.description?.slice(0, 5000) ||
      `${product.name} — arabische Lebensmittel bei ${opts?.siteName || "jmle"}`,
    image: images,
    sku: product.id,
    mpn: product.barcode || product.id,
    brand: {
      "@type": "Brand",
      name: opts?.siteName || "jmle",
    },
    category: opts?.categoryName,
    offers: offer,
  };

  if (product.barcode) {
    data.gtin = product.barcode;
  }

  const rating = opts?.rating;
  if (rating && rating.count > 0 && rating.value > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(rating.value.toFixed(1)),
      reviewCount: rating.count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return data;
}

export function breadcrumbJsonLd(
  items: Array<{ name: string; path: string }>
): JsonLd {
  const appUrl = getAppUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${appUrl}${item.path.startsWith("/") ? item.path : `/${item.path}`}`,
    })),
  };
}

export function collectionPageJsonLd(opts: {
  name: string;
  description: string;
  path: string;
  products?: Product[];
}): JsonLd {
  const appUrl = getAppUrl();
  const url = `${appUrl}${opts.path}`;
  const data: JsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: opts.name,
    description: opts.description,
    url,
  };
  if (opts.products?.length) {
    data.mainEntity = {
      "@type": "ItemList",
      numberOfItems: opts.products.length,
      itemListElement: opts.products.slice(0, 24).map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${appUrl}/products/${p.id}`,
        name: p.name,
      })),
    };
  }
  return data;
}

export function categoryJsonLd(
  category: Category,
  products: Product[],
  site: SiteConfig
): JsonLd[] {
  const path = `/categories/${category.id}`;
  const description = `Arabische Lebensmittel: ${category.name}${
    category.nameEn ? ` / ${category.nameEn}` : ""
  } bei ${site.name}`;
  return [
    collectionPageJsonLd({
      name: `${category.name} — ${site.name}`,
      description,
      path,
      products,
    }),
    breadcrumbJsonLd([
      { name: site.name, path: "/" },
      { name: "Kategorien", path: "/categories" },
      { name: category.name, path },
    ]),
  ];
}
