import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { isAuthError, requireStaff } from "@/lib/admin-server";
import {
  PRODUCT_SELECT,
  PRODUCT_SELECT_BASE,
  parseProductBody,
} from "@/lib/admin-payloads";
import { productArchiveSchema } from "@/lib/validations/product";
import { parseJsonBody } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function bustCatalogCache() {
  try {
    revalidateTag("catalog");
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

  const parsed = parseProductBody(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const payload = parsed.data;

  let { data, error } = await auth.supabase
    .from("products")
    .update(payload)
    .eq("id", id)
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
      .update(withoutOptional)
      .eq("id", id)
      .select(PRODUCT_SELECT_BASE)
      .single();
    data = retry.data as typeof data;
    error = retry.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  bustCatalogCache();
  return NextResponse.json({ product: data });
}

/** Soft Delete (Papierkorb) / Wiederherstellen */
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

  const parsed = parseJsonBody(productArchiveSchema, raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // Minimaler Select (id, deleted_at) — unabhängig von optionalen Spalten wie
  // badges/custom_note/status, damit Soft-Delete auf jeder DB funktioniert.
  const { data, error } = await auth.supabase
    .from("products")
    .update({
      deleted_at: parsed.data.archived ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select("id, deleted_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  bustCatalogCache();
  return NextResponse.json({ product: data });
}

/**
 * Endgültiges Löschen — nur wenn bereits im Papierkorb (deleted_at gesetzt).
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  const { data: existing, error: findErr } = await auth.supabase
    .from("products")
    .select("id, deleted_at, name_de, name_ar")
    .eq("id", id)
    .maybeSingle();

  if (findErr) {
    return NextResponse.json({ error: findErr.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Produkt nicht gefunden" }, { status: 404 });
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

  const { error } = await auth.supabase.from("products").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  bustCatalogCache();
  return NextResponse.json({ success: true, id });
}
