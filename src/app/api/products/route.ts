import { NextResponse } from "next/server";
import {
  getProductsAsync,
  getProductsByIdsAsync,
} from "@/lib/catalog-server";
import type { Product } from "@/types";

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
        .slice(0, 200);
      products = await getProductsByIdsAsync(ids);
    } else if (slim) {
      // Slim full-catalog is still large; prefer ids. Keep for backward compat.
      products = await getProductsAsync();
    } else {
      products = await getProductsAsync();
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
