import { NextResponse } from "next/server";
import { searchProductsAsync } from "@/lib/catalog-server";
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
    return NextResponse.json({ products: [], error: "Invalid query" }, { status: 400 });
  }

  const { q, limit } = parsed.data;

  try {
    const products = await searchProductsAsync(q, limit);
    const suggestions = products.map((p) => ({
      id: p.id,
      name: p.name,
      nameDe: p.nameDe,
      image: p.image,
      price: p.price,
      discountPercent: p.discountPercent,
    }));

    return NextResponse.json(
      { products: suggestions, query: q },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (err) {
    console.error("[api/search]", err);
    return NextResponse.json({ products: [] }, { status: 500 });
  }
}
