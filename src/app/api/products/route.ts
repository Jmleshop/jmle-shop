import { NextResponse } from "next/server";
import { getProductsAsync } from "@/lib/catalog-server";

export async function GET() {
  try {
    const products = await getProductsAsync();
    return NextResponse.json(
      { products },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch {
    return NextResponse.json({ products: [] }, { status: 500 });
  }
}
