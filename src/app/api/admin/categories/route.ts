import { NextResponse } from "next/server";
import { isAuthError, requireStaff } from "@/lib/admin-server";
import type { FoodCategory } from "@/types";
import { categoryCreateSchema } from "@/lib/validations/product";
import { parseJsonBody } from "@/lib/validations";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function GET(request: Request) {
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const archived = searchParams.get("archived") === "true";

  let query = auth.supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name_de", { ascending: true });

  if (!archived) {
    query = query.is("deleted_at", null);
  }

  const { data, error } = await query;
  if (error) {
    const fallback = await auth.supabase
      .from("categories")
      .select("*")
      .order("name_de", { ascending: true });
    if (fallback.error) {
      return NextResponse.json({ error: fallback.error.message }, { status: 500 });
    }
    const rows = (fallback.data ?? []) as FoodCategory[];
    return NextResponse.json({
      categories: archived ? rows : rows.filter((c) => !c.deleted_at),
    });
  }

  return NextResponse.json({ categories: (data ?? []) as FoodCategory[] });
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

  const parsed = parseJsonBody(categoryCreateSchema, raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { name_ar, name_de, image, sort_order, parent_id } = parsed.data;
  const id =
    (parsed.data.id && parsed.data.id.trim()) ||
    slugify(name_de || name_ar) ||
    `cat-${Date.now()}`;

  const payload = {
    id,
    name_ar,
    name_de,
    image,
    sort_order,
    parent_id,
  };

  let { data, error } = await auth.supabase
    .from("categories")
    .insert(payload)
    .select()
    .single();

  if (error) {
    const withoutId = {
      name_ar,
      name_de,
      image,
      sort_order,
      parent_id,
    };
    const retry = await auth.supabase
      .from("categories")
      .insert(withoutId)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ category: data }, { status: 201 });
}
