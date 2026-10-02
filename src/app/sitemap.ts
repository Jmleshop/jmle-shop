import type { MetadataRoute } from "next";
import {
  getBrandLogosAsync,
  getFlatCategoriesAsync,
  getProductsAsync,
} from "@/lib/catalog-server";
import { getAppUrl } from "@/lib/site-defaults";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = getAppUrl();
  const [products, categories, brands] = await Promise.all([
    getProductsAsync(),
    getFlatCategoriesAsync(),
    getBrandLogosAsync(),
  ]);

  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: appUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${appUrl}/categories`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${appUrl}/products`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${appUrl}/search`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.4,
    },
    {
      url: `${appUrl}/legal/impressum`,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${appUrl}/legal/datenschutz`,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${appUrl}/legal/widerruf`,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${appUrl}/categories/${c.id}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${appUrl}/products/${p.id}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const brandRoutes: MetadataRoute.Sitemap = brands
    .filter((b) => b.active !== false && b.id)
    .map((b) => ({
      url: `${appUrl}/brands/${encodeURIComponent(b.id)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

  return [
    ...staticRoutes,
    ...categoryRoutes,
    ...productRoutes,
    ...brandRoutes,
  ];
}
