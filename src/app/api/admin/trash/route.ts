import { NextResponse } from "next/server";
import {
  isAuthError,
  requireStaff,
  staffDataClient,
} from "@/lib/admin-server";
import {
  PRODUCT_SELECT,
  PRODUCT_SELECT_BASE,
  PRODUCT_SELECT_NO_BRAND,
} from "@/lib/admin-payloads";

/**
 * Papierkorb: alle soft-gelöschten Produkte & Kategorien.
 * Keine Änderung an aktiven Katalogdaten.
 */
export async function GET() {
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = staffDataClient(auth.supabase);

  let { data: products, error: pErr } = await db
    .from("products")
    .select(PRODUCT_SELECT)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (pErr && /brand_id/i.test(pErr.message)) {
    const retry = await db
      .from("products")
      .select(PRODUCT_SELECT_NO_BRAND)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
    products = retry.data as typeof products;
    pErr = retry.error;
  }

  if (pErr && /(status|badges|custom_note)/i.test(pErr.message)) {
    const retry = await db
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

  const { data: categories, error: cErr } = await db
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
