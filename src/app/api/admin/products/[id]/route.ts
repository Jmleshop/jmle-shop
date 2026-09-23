import { NextResponse } from "next/server";
import { isAuthError, requireStaff } from "@/lib/admin-server";
import {
  PRODUCT_SELECT,
  PRODUCT_SELECT_BASE,
  productPayload,
  validateProductPayload,
} from "@/lib/admin-payloads";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const body = await request.json();
  const payload = productPayload(body);
  const invalid = validateProductPayload(payload);
  if (invalid) {
    return NextResponse.json({ error: invalid }, { status: 400 });
  }

  let { data, error } = await auth.supabase
    .from("products")
    .update(payload)
    .eq("id", id)
    .select(PRODUCT_SELECT)
    .single();

  if (error && /status/i.test(error.message)) {
    const { status: _ignored, ...withoutStatus } = payload;
    void _ignored;
    const retry = await auth.supabase
      .from("products")
      .update(withoutStatus)
      .eq("id", id)
      .select(PRODUCT_SELECT_BASE)
      .single();
    data = retry.data as typeof data;
    error = retry.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const body = await request.json();
  const archived = Boolean(body.archived);

  const { data, error } = await auth.supabase
    .from("products")
    .update({ deleted_at: archived ? new Date().toISOString() : null })
    .eq("id", id)
    .select(PRODUCT_SELECT)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data });
}
