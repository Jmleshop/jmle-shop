import { NextResponse } from "next/server";
import {
  getProductsAsync,
  getProductsByIdsAsync,
} from "@/lib/catalog-server";
import type { Product } from "@/types";

const MAX_IDS = 100;
const MAX_PAGE_SIZE = 24;

/** Slim cart/wishlist DTO — drops heavy text fields and extra gallery URLs. */
function toCartProduct(p: Product): Product {
  const image = p.image || p.images?.[0] || "";
  return {
    ...p,
    description: "",
    ingredients: "",
    allergens: "",
    originCountry: "",
    bestBeforeNote: "",
    customNote: "",
    barcode: null,
    images: image ? [image] : [],
    image,
  };
}

/**
 * Public products API — never dumps the full catalog.
 * - `?ids=a,b&fields=cart` for cart/wishlist
 * - `?page=1&limit=24` for a small paginated slice
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");
    const fields = searchParams.get("fields");
    const slim = fields === "cart" || searchParams.get("slim") === "1";

    let products: Product[];

    if (idsParam != null && idsParam.trim()) {
      const ids = idsParam
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
        .slice(0, MAX_IDS);
      products = await getProductsByIdsAsync(ids);
    } else if (searchParams.has("page") || searchParams.has("limit")) {
      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
      const limit = Math.min(
        MAX_PAGE_SIZE,
        Math.max(1, parseInt(searchParams.get("limit") || "24", 10) || 24)
      );
      const all = await getProductsAsync();
      const start = (page - 1) * limit;
      products = all.slice(start, start + limit);
      const body = slim
        ? { products: products.map(toCartProduct), total: all.length, page, limit }
        : { products, total: all.length, page, limit };
      return NextResponse.json(body, {
        headers: {
          "Cache-Control":
            "public, s-maxage=300, stale-while-revalidate=600",
        },
      });
    } else {
      return NextResponse.json(
        {
          error: "ids oder page/limit erforderlich — Vollkatalog-Export deaktiviert",
          products: [],
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    if (slim) {
      products = products.map(toCartProduct);
    }

    return NextResponse.json(
      { products },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch {
    return NextResponse.json({ products: [] }, { status: 500 });
  }
}
