import { NextResponse } from "next/server";
import { isAuthError, requireStaff } from "@/lib/admin-server";

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
  const name_ar = String(body.name_ar ?? "").trim();
  const name_de = String(body.name_de ?? "").trim();
  if (!name_ar) {
    return NextResponse.json({ error: "Arabischer Name ist Pflicht" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("categories")
    .update({
      name_ar,
      name_de,
      image: body.image ? String(body.image) : null,
      sort_order: Number(body.sort_order ?? 0) || 0,
      parent_id: body.parent_id || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ category: data });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { id } = await params;
  const body = await request.json();

  if (Array.isArray(body.order)) {
    for (const row of body.order as { id: string; sort_order: number }[]) {
      await auth.supabase
        .from("categories")
        .update({ sort_order: row.sort_order })
        .eq("id", row.id);
    }
    return NextResponse.json({ success: true });
  }

  const archived = Boolean(body.archived);
  const { data, error } = await auth.supabase
    .from("categories")
    .update({ deleted_at: archived ? new Date().toISOString() : null })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ category: data });
}
