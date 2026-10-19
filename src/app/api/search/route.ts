import { NextResponse } from "next/server";
import {
  searchBrandsAsync,
  searchProductsAsync,
} from "@/lib/catalog-server";
import { z } from "zod";

const querySchema = z.object({
  q: z.string().trim().max(80).default(""),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    q: searchParams.get("q") ?? "",
    limit: searchParams.get("limit") ?? "12",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { products: [], brands: [], error: "Invalid query" },
      { status: 400 }
    );
  }

  const { q, limit } = parsed.data;
  const brandLimit = Math.min(6, Math.max(2, Math.floor(limit / 2)));
  const productLimit = limit;

  try {
    const [products, brands] = await Promise.all([
      searchProductsAsync(q, productLimit),
      q.trim().length >= 2 ? searchBrandsAsync(q, brandLimit) : Promise.resolve([]),
    ]);

    const productSuggestions = products.map((p) => ({
      id: p.id,
      name: p.name,
      nameDe: p.nameDe,
      image: p.image,
      price: p.price,
      discountPercent: p.discountPercent,
    }));

    const brandSuggestions = brands.map((b) => ({
      id: b.id,
      name: b.name,
      image: b.image,
    }));

    return NextResponse.json(
      {
        products: productSuggestions,
        brands: brandSuggestions,
        query: q,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (err) {
    console.error("[api/search]", err);
    return NextResponse.json(
      { products: [], brands: [], error: "search_failed" },
      { status: 500 }
    );
  }
}
