import { NextResponse } from "next/server";
import { getProductsAsync, getProductsPageAsync } from "@/lib/catalog-server";
import { PRODUCT_PAGE_SIZE, pageFromSearchParam } from "@/lib/pagination";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const headers = {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    };
    if (!url.searchParams.has("page")) {
      const products = await getProductsAsync();
      return NextResponse.json({ products }, { headers });
    }
    const page = pageFromSearchParam(url.searchParams.get("page") ?? undefined);
    const result = await getProductsPageAsync(page);
    return NextResponse.json(
      {
        products: result.products,
        page: result.page,
        pageSize: PRODUCT_PAGE_SIZE,
        total: result.total,
        pages: result.pages,
      },
      { headers }
    );
  } catch {
    return NextResponse.json(
      { products: [], page: 1, pageSize: PRODUCT_PAGE_SIZE, total: 0, pages: 1 },
      { status: 500 }
    );
  }
}
