import { NextResponse } from "next/server";
import { isAuthError, requireStaff } from "@/lib/admin-server";
import { createServiceClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Zeichen entfernen, die die PostgREST-Filtersyntax von .or() aufbrechen würden.
  const q = new URL(request.url).searchParams
    .get("q")
    ?.replace(/[,()*%\\]/g, " ")
    .trim()
    .slice(0, 80);
  const service = createServiceClient();
  if (q) {
    const { data, error } = await service
      .from("products")
      .select("id, name_de, name_ar, barcode, stock_quantity")
      .is("deleted_at", null)
      .or(`name_de.ilike.%${q}%,name_ar.ilike.%${q}%`)
      .limit(8);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ products: data ?? [] });
  }

  const { data, error } = await service
    .from("products")
    .select("id, name_de, name_ar, barcode, stock_quantity, min_stock_alert")
    .is("deleted_at", null)
    .order("stock_quantity", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const low = (data ?? []).filter((row) => {
    const stock = Number(row.stock_quantity ?? 0);
    const min = Number(row.min_stock_alert ?? 5);
    return stock <= min;
  });
  return NextResponse.json({ products: low });
}

export async function POST(request: Request) {
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const barcode = String(body?.barcode ?? "").trim();
  const delta = Number(body?.delta ?? -1);
  const assignProductId = typeof body?.productId === "string" ? body.productId : "";
  if (!barcode && !assignProductId) {
    return NextResponse.json({ error: "Barcode fehlt" }, { status: 400 });
  }
  if (!Number.isFinite(delta) || delta === 0) {
    return NextResponse.json({ error: "Menge ungültig" }, { status: 400 });
  }

  const service = createServiceClient();
  let query = service
    .from("products")
    .select("id, name_de, name_ar, barcode, stock_quantity, min_stock_alert")
    .is("deleted_at", null);
  query = assignProductId ? query.eq("id", assignProductId) : query.eq("barcode", barcode);
  const { data: product, error } = await query.maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!product) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const nextStock = Math.max(0, Number(product.stock_quantity ?? 0) + Math.trunc(delta));
  const patch: { stock_quantity: number; barcode?: string } = { stock_quantity: nextStock };
  if (body.assign === true && assignProductId && barcode) patch.barcode = barcode;

  const { error: updateError } = await service.from("products").update(patch).eq("id", product.id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({
    product: {
      ...product,
      barcode: patch.barcode ?? product.barcode,
      stock_quantity: nextStock,
    },
  });
}
