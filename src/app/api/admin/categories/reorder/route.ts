import { NextResponse } from "next/server";
import { isAuthError, requireStaff } from "@/lib/admin-server";
import { CATEGORY_MAX_DEPTH } from "@/lib/category-dnd";
import type { FoodCategory } from "@/types";
import { categoryReorderSchema } from "@/lib/validations/product";
import { parseJsonBody } from "@/lib/validations";

export async function PUT(request: Request) {
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

  const parsed = parseJsonBody(categoryReorderSchema, raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const order = parsed.data.order;

  const { data: existing } = await auth.supabase.from("categories").select("*");
  const byId = new Map(((existing ?? []) as FoodCategory[]).map((c) => [c.id, c]));

  const depthOf = (id: string | null, seen = new Set<string>()): number => {
    if (!id) return 0;
    if (seen.has(id)) return 99;
    seen.add(id);
    const row = order.find((r) => r.id === id);
    const parent = row ? row.parent_id ?? null : byId.get(id)?.parent_id ?? null;
    return 1 + depthOf(parent, seen);
  };

  for (const row of order) {
    const parentId = row.parent_id || null;
    if (parentId === row.id) {
      return NextResponse.json(
        { error: "Kategorie kann nicht sich selbst untergeordnet sein" },
        { status: 400 }
      );
    }
    if (parentId && !byId.has(parentId)) {
      return NextResponse.json(
        { error: "Übergeordnete Kategorie fehlt" },
        { status: 400 }
      );
    }
    const depth = depthOf(row.id);
    if (depth > CATEGORY_MAX_DEPTH + 1) {
      return NextResponse.json(
        { error: "Maximal 3 Kategorie-Ebenen erlaubt" },
        { status: 400 }
      );
    }
    await auth.supabase
      .from("categories")
      .update({
        sort_order: row.sort_order,
        parent_id: parentId,
      })
      .eq("id", row.id);
  }
  return NextResponse.json({ success: true });
}
