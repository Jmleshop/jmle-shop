"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";
import { useWishlist } from "@/context/WishlistContext";
import { useShopLocale } from "@/components/ShopLocale";
import { productTitle } from "@/lib/shop-i18n";
import ShopImage from "@/components/ShopImage";
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
  const [fetchOk, setFetchOk] = useState(false);
  const cleanedRef = useRef(false);
  const idsKey = ids.join(",");

  useEffect(() => {
    if (!idsKey) {
      setCatalog([]);
      setFetchOk(true);
      setLoading(false);
      return;
    }
    const qs = new URLSearchParams({
      ids: idsKey,
      fields: "cart",
    });
    let cancelled = false;
    setLoading(true);
    setFetchOk(false);
    fetch(`/api/products?${qs.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error("products fetch failed");
        return r.json();
      })
      .then((d) => {
        if (!cancelled) {
          setCatalog((d.products as Product[]) ?? []);
          setFetchOk(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCatalog([]);
          setFetchOk(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  // Geister-IDs (angefragt, aber nicht mehr im Katalog) bereinigen
  useEffect(() => {
    if (loading || wlLoading || !fetchOk || cleanedRef.current) return;
    if (!ids.length) return;
    const valid = new Set(catalog.map((p) => p.id));
    const stale = ids.filter((id) => !valid.has(id));
    if (!stale.length) {
      cleanedRef.current = true;
      return;
    }
    cleanedRef.current = true;
    void (async () => {
      for (const id of stale) {
        await remove(id);
      }
    })();
  }, [loading, wlLoading, fetchOk, catalog, ids, remove]);

  const products = useMemo(() => {
    const map = new Map(catalog.map((p) => [p.id, p]));
    return ids
      .map((id) => map.get(id))
      .filter((p): p is Product => Boolean(p));
  }, [ids, catalog]);

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
              ? t("wishlistEmpty")
              : t("wishlistItemsCount", { count })}
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
          {products.map((product) => {
            const unavailable = product.stock <= 0 || !product.inStock;
            return (
              <li
                key={product.id}
                className="card-boutique overflow-hidden flex flex-col sm:flex-row lg:flex-col"
              >
                <Link href={`/products/${product.id}`} className="shrink-0 sm:w-36 lg:w-full">
                  <ShopImage
                    role="product"
                    src={product.image}
                    alt={productTitle(lang, product)}
                    unoptimized
                    sizes="(max-width: 640px) 100vw, 200px"
                    frameClassName="sm:aspect-square"
                  />
                </Link>
                <div className="flex-1 p-4 flex flex-col gap-3">
                  <Link href={`/products/${product.id}`} className="block">
                    <h2 className="font-ui font-medium text-luxury-ink line-clamp-2">
                      {productTitle(lang, product)}
                    </h2>
                    {unavailable ? (
                      <p className="mt-1 text-sm font-ui text-amber-700">
                        {t("wishlistUnavailable")}
                      </p>
                    ) : (
                      <div className="mt-1">
                        <ProductPrice product={product} align="start" />
                      </div>
                    )}
                  </Link>
                  <div className="mt-auto flex flex-wrap gap-2">
                    {unavailable ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1 min-h-11"
                        leadingIcon={<Trash2 size={16} />}
                        onClick={() => void remove(product.id)}
                      >
                        {t("wishlistRemove")}
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          className="flex-1 min-h-11"
                          leadingIcon={<ShoppingBag size={16} />}
                          onClick={() => void addItem(product.id)}
                        >
                          {t("addToCart")}
                        </Button>
                        <button
                          type="button"
                          onClick={() => void remove(product.id)}
                          className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl border border-amber-200/60 text-gray-500 hover:text-red-600 hover:border-red-200"
                          aria-label={t("wishlistRemove")}
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
