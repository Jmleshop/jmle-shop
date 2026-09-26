"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";
import { useWishlist } from "@/context/WishlistContext";
import { useShopLocale } from "@/components/ShopLocale";
import { productTitle } from "@/lib/shop-i18n";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/types";
import { ProductPrice } from "@/components/ProductPrice";
import { Button } from "@/components/ui";
import { Skeleton } from "@/components/ui/Skeleton";

export default function WishlistPage() {
  const { ids, count, loading: wlLoading, remove, clear } = useWishlist();
  const { lang, t } = useShopLocale();
  const { addItem } = useCart();
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => {
        setCatalog((d.products as Product[]) ?? []);
      })
      .catch(() => setCatalog([]))
      .finally(() => setLoading(false));
  }, []);

  const products = useMemo(() => {
    const map = new Map(catalog.map((p) => [p.id, p]));
    return ids.map((id) => {
      const found = map.get(id);
      if (found) return found;
      return {
        id,
        name: t("wishlistSaved"),
        description: "",
        price: 0,
        discountPercent: 0,
        vatRate: 7,
        categoryId: "",
        image: "/placeholder.svg",
        images: [],
        stock: 0,
        inStock: false,
        maxOrderQuantity: null,
      } satisfies Product;
    });
  }, [ids, catalog, t]);

  const busy = wlLoading || loading;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-luxury-ink flex items-center gap-2">
            <Heart className="text-red-500" size={28} aria-hidden />
            {t("wishlistTitle")}
          </h1>
          <p className="text-sm text-gray-500 font-ui mt-1">
            {count === 0
              ? "لا توجد منتجات محفوظة"
              : `${count} منتج محفوظ`}
          </p>
        </div>
        {count > 0 && (
          <button
            type="button"
            onClick={() => void clear()}
            className="text-sm font-ui text-gray-500 hover:text-red-600 min-h-11 px-3"
          >
            {t("clearAll")}
          </button>
        )}
      </div>

      {busy ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 card-boutique px-6">
          <Heart size={40} className="mx-auto text-amber-200 mb-4" aria-hidden />
          <p className="font-ui text-luxury-charcoal mb-6">
            {t("wishlistEmpty")}
          </p>
          <Link href="/" className="btn-primary inline-flex min-h-12">
            {t("browse")}
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {products.map((product) => (
            <li
              key={product.id}
              className="card-boutique overflow-hidden flex flex-col sm:flex-row lg:flex-col"
            >
              <Link
                href={`/products/${product.id}`}
                className="relative aspect-square sm:w-36 sm:aspect-square lg:w-full shrink-0 bg-jmle-warm"
              >
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 200px"
                />
              </Link>
              <div className="flex-1 p-4 flex flex-col gap-3">
                <Link href={`/products/${product.id}`} className="block">
                  <h2 className="font-ui font-medium text-luxury-ink line-clamp-2">
                    {productTitle(lang, product)}
                  </h2>
                  <div className="mt-1">
                    <ProductPrice product={product} align="start" />
                  </div>
                </Link>
                <div className="mt-auto flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="flex-1 min-h-11"
                    leadingIcon={<ShoppingBag size={16} />}
                    disabled={product.stock <= 0}
                    onClick={() => void addItem(product.id)}
                  >
                    أضف للسلة
                  </Button>
                  <button
                    type="button"
                    onClick={() => void remove(product.id)}
                    className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl border border-amber-200/60 text-gray-500 hover:text-red-600 hover:border-red-200"
                    aria-label="إزالة من المفضلة"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
