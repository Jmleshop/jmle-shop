import { NextResponse } from "next/server";
import { isAdminError, requireAdmin } from "@/lib/admin-server";
import { createServiceClient } from "@/lib/supabase/admin";
import { discountCodeCreateSchema } from "@/lib/validations/checkout";
import { parseJsonBody } from "@/lib/validations";

export async function GET() {
  const auth = await requireAdmin();
  if (isAdminError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("discount_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ discounts: data });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (isAdminError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  const parsed = parseJsonBody(discountCodeCreateSchema, raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { code, type, value, usage_limit, expires_at, active } = parsed.data;

  if (type === "percent" && value > 100) {
    return NextResponse.json(
      { error: "Prozent-Rabatt maximal 100" },
      { status: 400 }
    );
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("discount_codes")
    .insert({
      code: code.toUpperCase(),
      type,
      value,
      usage_limit: usage_limit ?? null,
      expires_at: expires_at ?? null,
      active: active ?? true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ discount: data }, { status: 201 });
}
