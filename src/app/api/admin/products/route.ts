import { NextResponse } from "next/server";
import { isAuthError, requireStaff } from "@/lib/admin-server";
import {
  PRODUCT_SELECT,
  PRODUCT_SELECT_BASE,
  parseProductBody,
} from "@/lib/admin-payloads";
import type { FoodProduct } from "@/types";

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
  if (error && /(status|badges|custom_note)/i.test(error.message)) {
    let fallback = auth.supabase
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
  const payload = parsed.data;

  let { data, error } = await auth.supabase
    .from("products")
    .insert(payload)
    .select(PRODUCT_SELECT)
    .single();

  if (error && /(status|badges|custom_note)/i.test(error.message)) {
    const {
      status: _s,
      badges: _b,
      custom_note: _c,
      ...withoutOptional
    } = payload;
    void _s;
    void _b;
    void _c;
    const retry = await auth.supabase
      .from("products")
      .insert(withoutOptional)
      .select(PRODUCT_SELECT_BASE)
      .single();
    data = retry.data as typeof data;
    error = retry.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data }, { status: 201 });
}
