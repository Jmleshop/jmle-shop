import { NextResponse } from "next/server";
import { isAuthError, requireStaff } from "@/lib/admin-server";
import { PRODUCT_SELECT, PRODUCT_SELECT_BASE } from "@/lib/admin-payloads";

/**
 * Papierkorb: alle soft-gelöschten Produkte & Kategorien.
 * Keine Änderung an aktiven Katalogdaten.
 */
export async function GET() {
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let { data: products, error: pErr } = await auth.supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (pErr && /(status|badges|custom_note)/i.test(pErr.message)) {
    const retry = await auth.supabase
      .from("products")
      .select(PRODUCT_SELECT_BASE)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
    products = retry.data as typeof products;
    pErr = retry.error;
  }

  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  const { data: categories, error: cErr } = await auth.supabase
    .from("categories")
    .select(
      "id, name_ar, name_de, image, parent_id, sort_order, deleted_at, created_at, updated_at"
    )
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }

  return NextResponse.json({
    products: products ?? [],
    categories: categories ?? [],
  });
}
