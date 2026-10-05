import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import {
  isAuthError,
  requireStaff,
  staffDataClient,
} from "@/lib/admin-server";
import {
  PRODUCT_SELECT,
  PRODUCT_SELECT_BASE,
  parseProductBody,
} from "@/lib/admin-payloads";
import { productArchiveSchema } from "@/lib/validations/product";
import { parseJsonBody } from "@/lib/validations";
import {
  resolveProductBrand,
  stripBrandName,
} from "@/lib/resolve-product-brand";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function bustCatalogCache() {
  try {
    revalidateTag("catalog");
    revalidateTag("products");
    revalidateTag("brands");
  } catch {
    /* ignore */
  }
}

const PRODUCT_SELECT_WITH_BRAND_NO_OPTIONAL =
  "id, name_ar, name_de, description, price, currency, category_id, brand_id, image, images, ingredients, allergens, origin_country, weight_value, weight_unit, gross_weight_value, gross_weight_unit, best_before_note, vat_rate, purchase_price, discount_percent, barcode, product_number, max_order_quantity, stock_quantity, deleted_at, created_at, updated_at, category:categories(id, name_ar, name_de)";

export async function PUT(request: Request, { params }: RouteParams) {
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = staffDataClient(auth.supabase);
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
  const resolved = await resolveProductBrand(db, parsed.data);
  if (resolved.error) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }
  const payload = {
    ...stripBrandName(parsed.data),
    brand_id: resolved.brand_id,
  };

  let { data, error } = await db
    .from("products")
    .update(payload)
    .eq("id", id)
    .select(PRODUCT_SELECT)
    .single();

  // brand_id nie stillschweigend verwerfen
  if (error && /brand_id/i.test(error.message)) {
    return NextResponse.json(
      {
        error: `Marke konnte nicht gespeichert werden: ${error.message}. Prüfen Sie, ob die Spalte brand_id existiert (Migration product_brand_id).`,
      },
      { status: 500 }
    );
  }

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
    // brand_id bleibt im Update-Payload
    const retry = await db
      .from("products")
      .update(withoutOptional)
      .eq("id", id)
      .select(PRODUCT_SELECT_WITH_BRAND_NO_OPTIONAL)
      .single();

    if (retry.error && /brand_id/i.test(retry.error.message)) {
      return NextResponse.json(
        {
          error: `Marke konnte nicht gespeichert werden: ${retry.error.message}`,
        },
        { status: 500 }
      );
    }

    if (retry.error) {
      const base = await db
        .from("products")
        .update(withoutOptional)
        .eq("id", id)
        .select(PRODUCT_SELECT_BASE)
        .single();
      if (base.error && /brand_id/i.test(base.error.message)) {
        return NextResponse.json(
          {
            error: `Marke konnte nicht gespeichert werden: ${base.error.message}`,
          },
          { status: 500 }
        );
      }
      data = base.data as typeof data;
      error = base.error;
    } else {
      data = retry.data as typeof data;
      error = retry.error;
    }
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

  const db = staffDataClient(auth.supabase);
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
  const { data, error } = await db
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

  const db = staffDataClient(auth.supabase);
  const { id } = await params;

  const { data: existing, error: findErr } = await db
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

  const { error } = await db.from("products").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  bustCatalogCache();
  return NextResponse.json({ success: true, id });
}
