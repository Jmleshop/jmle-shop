import { NextResponse } from "next/server";
import { isAuthError, requireStaff } from "@/lib/admin-server";
import {
  PRODUCT_SELECT,
  PRODUCT_SELECT_BASE,
  parseProductBody,
} from "@/lib/admin-payloads";
import { nextProductNumber } from "@/lib/product-numbers";
import {
  resolveProductBrand,
  stripBrandName,
} from "@/lib/resolve-product-brand";
import type { FoodProduct } from "@/types";

const SELECT_NO_BRAND =
  "id, name_ar, name_de, description, price, currency, category_id, image, images, ingredients, allergens, origin_country, weight_value, weight_unit, gross_weight_value, gross_weight_unit, best_before_note, vat_rate, purchase_price, discount_percent, barcode, product_number, max_order_quantity, stock_quantity, status, badges, custom_note, deleted_at, created_at, updated_at, category:categories(id, name_ar, name_de)";

export async function GET(request: Request) {
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const archived = searchParams.get("archived") === "true";
  const status = searchParams.get("status");

  let query = auth.supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .order("created_at", { ascending: false });

  if (!archived) {
    query = query.is("deleted_at", null);
  }
  if (status === "draft" || status === "published") {
    query = query.eq("status", status);
  }

  let { data, error } = await query;
  if (error && /(status|badges|custom_note|brand_id)/i.test(error.message)) {
    const useNoBrand = /brand_id/i.test(error.message);
    let fallback = useNoBrand
      ? auth.supabase
          .from("products")
          .select(SELECT_NO_BRAND)
          .order("created_at", { ascending: false })
      : auth.supabase
          .from("products")
          .select(PRODUCT_SELECT_BASE)
          .order("created_at", { ascending: false });
    if (!archived) fallback = fallback.is("deleted_at", null);
    const retry = await fallback;
    data = retry.data as typeof data;
    error = retry.error;
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    products: (data ?? []) as unknown as FoodProduct[],
  });
}

export async function POST(request: Request) {
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  const parsed = parseProductBody(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const resolved = await resolveProductBrand(auth.supabase, parsed.data);
  const payload = {
    ...stripBrandName(parsed.data),
    brand_id: resolved.brand_id,
  };

  if (!payload.product_number) {
    const existing = await auth.supabase.from("products").select("product_number");
    payload.product_number = nextProductNumber(
      (existing.data ?? []).map((row) => row.product_number as string | null)
    );
  }

  let { data, error } = await auth.supabase
    .from("products")
    .insert(payload)
    .select(PRODUCT_SELECT)
    .single();

  if (error && /(status|badges|custom_note|brand_id)/i.test(error.message)) {
    const {
      status: _s,
      badges: _b,
      custom_note: _c,
      brand_id: _brand,
      ...withoutOptional
    } = payload;
    void _s;
    void _b;
    void _c;
    void _brand;
    const retry = await auth.supabase
      .from("products")
      .insert(withoutOptional)
      .select(SELECT_NO_BRAND)
      .single();
    data = retry.data as typeof data;
    error = retry.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data }, { status: 201 });
}
