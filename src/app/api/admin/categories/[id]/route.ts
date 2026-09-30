import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { isAuthError, requireStaff } from "@/lib/admin-server";
import {
  categoryUpdateSchema,
  productArchiveSchema,
} from "@/lib/validations/product";
import { parseJsonBody } from "@/lib/validations";
import { detachProductsFromCategory } from "@/lib/category-product-guard";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function bustCatalogCache() {
  try {
    revalidateTag("catalog");
    revalidateTag("categories");
    revalidateTag("products");
  } catch {
    /* ignore */
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  const parsed = parseJsonBody(categoryUpdateSchema, raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("categories")
    .update({
      name_ar: parsed.data.name_ar,
      name_de: parsed.data.name_de,
      image: parsed.data.image,
      sort_order: parsed.data.sort_order,
      parent_id: parsed.data.parent_id,
      show_on_homepage: parsed.data.show_on_homepage,
    })
    .eq("id", id)
    .select()
    .single();

  if (error && /show_on_homepage|column/i.test(error.message)) {
    const retry = await auth.supabase
      .from("categories")
      .update({
        name_ar: parsed.data.name_ar,
        name_de: parsed.data.name_de,
        image: parsed.data.image,
        sort_order: parsed.data.sort_order,
        parent_id: parsed.data.parent_id,
      })
      .eq("id", id)
      .select()
      .single();
    if (retry.error) {
      return NextResponse.json({ error: retry.error.message }, { status: 500 });
    }
    bustCatalogCache();
    return NextResponse.json({ category: retry.data });
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  bustCatalogCache();
  return NextResponse.json({ category: data });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { id } = await params;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  const orderSchema = z.object({
    order: z.array(
      z.object({
        id: z.string().min(1),
        sort_order: z.coerce.number().int().min(0),
      })
    ),
  });

  const asOrder = orderSchema.safeParse(raw);
  if (asOrder.success) {
    for (const row of asOrder.data.order) {
      await auth.supabase
        .from("categories")
        .update({ sort_order: row.sort_order })
        .eq("id", row.id);
    }
    bustCatalogCache();
    return NextResponse.json({ success: true });
  }

  const parsed = parseJsonBody(productArchiveSchema, raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // Beim Archivieren: Produkte behalten, nur Zuordnung lösen → „ohne Kategorie“
  let productsDetached = 0;
  if (parsed.data.archived) {
    const detached = await detachProductsFromCategory(auth.supabase, id);
    if (detached.error) {
      return NextResponse.json({ error: detached.error }, { status: 500 });
    }
    productsDetached = detached.detached;
  }

  const { data, error } = await auth.supabase
    .from("categories")
    .update({
      deleted_at: parsed.data.archived ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  bustCatalogCache();
  return NextResponse.json({ category: data, productsDetached });
}

/**
 * Endgültiges Löschen — nur aus dem Papierkorb.
 * Produkte werden NIEMALS mitgelöscht: category_id → NULL (FK ON DELETE SET NULL).
 * Blockiert nur bei vorhandenen Unterkategorien.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  const { data: existing, error: findErr } = await auth.supabase
    .from("categories")
    .select("id, deleted_at, name_de, name_ar")
    .eq("id", id)
    .maybeSingle();

  if (findErr) {
    return NextResponse.json({ error: findErr.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Kategorie nicht gefunden" }, { status: 404 });
  }
  if (!existing.deleted_at) {
    return NextResponse.json(
      {
        error:
          "Zuerst in den Papierkorb verschieben. Endgültiges Löschen nur aus dem Papierkorb.",
      },
      { status: 400 }
    );
  }

  const { count: childCount } = await auth.supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", id);

  if ((childCount ?? 0) > 0) {
    return NextResponse.json(
      {
        error:
          "Unterkategorien zuerst in den Papierkorb legen bzw. endgültig löschen.",
      },
      { status: 400 }
    );
  }

  // Produktschutz: Zuordnung lösen, Bestand bleibt vollständig erhalten
  const detached = await detachProductsFromCategory(auth.supabase, id);
  if (detached.error) {
    return NextResponse.json({ error: detached.error }, { status: 500 });
  }

  const { error } = await auth.supabase.from("categories").delete().eq("id", id);

  if (error) {
    // Falls FK noch CASCADE/RESTRICT wäre: Produkte bleiben dank vorherigem Detach
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  bustCatalogCache();
  return NextResponse.json({
    success: true,
    id,
    productsDetached: detached.detached,
    message:
      detached.detached > 0
        ? `${detached.detached} Produkt(e) behalten — jetzt ohne Kategorie.`
        : "Kategorie gelöscht.",
  });
}
