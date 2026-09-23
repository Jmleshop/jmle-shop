import { NextResponse } from "next/server";
import { getProductsAsync } from "@/lib/catalog-server";

export async function GET() {
  try {
    const products = await getProductsAsync();
    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ products: [] }, { status: 500 });
  }
}
