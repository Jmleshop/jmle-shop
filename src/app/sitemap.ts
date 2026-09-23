import type { MetadataRoute } from "next";
import {
  getFlatCategoriesAsync,
  getProductsAsync,
} from "@/lib/catalog-server";
import { getAppUrl } from "@/lib/site-defaults";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = getAppUrl();
  const [products, categories] = await Promise.all([
    getProductsAsync(),
    getFlatCategoriesAsync(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: appUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${appUrl}/categories`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${appUrl}/search`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
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
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${appUrl}/products/${p.id}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
