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
  parseProductBody,
} from "@/lib/admin-payloads";
import { nextProductNumber } from "@/lib/product-numbers";
import {
  resolveProductBrand,
  stripBrandName,
} from "@/lib/resolve-product-brand";
import type { FoodProduct } from "@/types";

type Db = ReturnType<typeof staffDataClient>;

async function selectProducts(
  db: Db,
  archived: boolean,
  status: string | null
) {
  const build = (columns: string) => {
    let query = db
      .from("products")
      .select(columns)
      .order("created_at", { ascending: false });
    if (!archived) {
      query = query.is("deleted_at", null);
    }
    if (status === "draft") {
      query = query.eq("status", "draft");
    } else if (status === "published") {
      // Match public catalog: null status counts as published on older DBs
      query = query.or("status.is.null,status.eq.published");
    }
    return query;
  };

  let { data, error } = await build(PRODUCT_SELECT);

  if (error && /brand_id/i.test(error.message)) {
    const retry = await build(PRODUCT_SELECT_NO_BRAND);
    data = retry.data as typeof data;
    error = retry.error;
  }

  if (error && /(status|badges|custom_note)/i.test(error.message)) {
    let fallback = db
      .from("products")
      .select(PRODUCT_SELECT_BASE)
      .order("created_at", { ascending: false });
    if (!archived) fallback = fallback.is("deleted_at", null);
    const retry = await fallback;
    data = retry.data as typeof data;
    error = retry.error;
    // Client-side status filter when column missing (all treated as published)
    if (!error && status === "draft") {
      data = [];
    }
  }

  return { data, error };
}

export async function GET(request: Request) {
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = staffDataClient(auth.supabase);
  const { searchParams } = new URL(request.url);
  const archived = searchParams.get("archived") === "true";
  const status = searchParams.get("status");

  const { data, error } = await selectProducts(db, archived, status);
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

  const db = staffDataClient(auth.supabase);

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

  const resolved = await resolveProductBrand(db, parsed.data);
  const payload = {
    ...stripBrandName(parsed.data),
    brand_id: resolved.brand_id,
  };

  if (!payload.product_number) {
    const existing = await db.from("products").select("product_number");
    payload.product_number = nextProductNumber(
      (existing.data ?? []).map((row) => row.product_number as string | null)
    );
  }

  let { data, error } = await db
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
    const retry = await db
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
