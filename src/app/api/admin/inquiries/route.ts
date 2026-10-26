import { NextResponse } from "next/server";
import { isAdminError, requireAdmin } from "@/lib/admin-server";
import { createServiceClient } from "@/lib/supabase/admin";
import { sanitizeInquiryLines, summarizeLines } from "@/lib/inquiry";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (isAdminError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim();
  const service = createServiceClient();

  if (q) {
    const { data, error } = await service
      .from("products")
      .select("id, name_ar, name_de, price, vat_rate, stock_quantity, discount_percent")
      .is("deleted_at", null)
      .or(`name_ar.ilike.%${q}%,name_de.ilike.%${q}%`)
      .limit(8);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ products: data ?? [] });
  }

  const { data, error } = await service
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inquiries: data ?? [] });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (isAdminError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "ID fehlt" }, { status: 400 });

  const service = createServiceClient();
  const patch: Record<string, unknown> = {};

  if (body.status === "open" || body.status === "done") patch.status = body.status;
  if (typeof body.notes === "string") patch.notes = body.notes;
  const items = sanitizeInquiryLines(body.items);
  if (items) {
    const totals = summarizeLines(items);
    patch.items = items;
    patch.subtotal = totals.subtotal;
    patch.vat_amount = totals.vat;
    patch.total = totals.total;
  }
  if (body.issue === true) {
    const { data: current } = await service
      .from("inquiries")
      .select("invoice_number")
      .eq("id", id)
      .maybeSingle();
    const year = new Date().getFullYear();
    patch.invoice_status = "issued";
    patch.invoice_issued_at = new Date().toISOString();
    patch.invoice_number =
      current?.invoice_number || `JM-${year}-${id.slice(0, 6).toUpperCase()}`;
  }

  const { data, error } = await service
    .from("inquiries")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inquiry: data });
}
