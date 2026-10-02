import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { isAuthError, requireStaff, staffDataClient } from "@/lib/admin-server";
import { isDuplicateBrandName } from "@/lib/brand-name";

function bust() {
  try {
    revalidateTag("catalog");
    revalidateTag("slides");
    revalidateTag("brands");
  } catch {
    /* ignore */
  }
}

const DUPLICATE_BRAND_DE = "Dieser Markenname existiert bereits";
const DUPLICATE_BRAND_AR = "اسم العلامة التجارية موجود بالفعل";

async function findDuplicateBrandName(
  db: ReturnType<typeof staffDataClient>,
  name: string,
  excludeId?: string
): Promise<boolean> {
  const { data, error } = await db.from("brand_logos").select("id, name");
  if (error || !data) return false;
  return isDuplicateBrandName(name, data, excludeId);
}

export async function GET() {
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = staffDataClient(auth.supabase);
  const { data, error } = await db
    .from("brand_logos")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    if (/relation|does not exist|42P01/i.test(error.message)) {
      return NextResponse.json({
        logos: [],
        hint: "Bitte SQL feature-homepage-sliders.sql in Supabase ausführen.",
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ logos: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = staffDataClient(auth.supabase);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  const image = String(body.image ?? "").trim();
  if (!image) {
    return NextResponse.json({ error: "Logo-Bild ist Pflicht" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json(
      { error: "Markenname ist Pflicht (nur intern sichtbar)" },
      { status: 400 }
    );
  }

  const id =
    String(body.id ?? "").trim() ||
    `brand-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const isDuplicate = await findDuplicateBrandName(db, name, id);
  if (isDuplicate) {
    return NextResponse.json(
      { error: DUPLICATE_BRAND_DE, errorAr: DUPLICATE_BRAND_AR },
      { status: 409 }
    );
  }

  const payload = {
    id,
    name,
    image,
    link_url: String(body.link_url ?? "").trim() || null,
    sort_order: Number(body.sort_order ?? 0) || 0,
    active: body.active !== false,
  };

  const { data, error } = await db
    .from("brand_logos")
    .upsert(payload)
    .select()
    .single();

  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      return NextResponse.json({ error: DUPLICATE_BRAND_DE }, { status: 409 });
    }
    return NextResponse.json(
      {
        error: error.message,
        hint: /relation|does not exist/i.test(error.message)
          ? "Bitte SQL feature-homepage-sliders.sql in Supabase ausführen."
          : undefined,
      },
      { status: 500 }
    );
  }

  bust();
  return NextResponse.json({ logo: data });
}

export async function PATCH(request: Request) {
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = staffDataClient(auth.supabase);

  let body: { order?: Array<{ id: string; sort_order: number }> };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.order)) {
    return NextResponse.json({ error: "order fehlt" }, { status: 400 });
  }

  for (const row of body.order) {
    await db
      .from("brand_logos")
      .update({ sort_order: row.sort_order })
      .eq("id", row.id);
  }
  bust();
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = staffDataClient(auth.supabase);
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  }

  const { error } = await db.from("brand_logos").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  bust();
  return NextResponse.json({ success: true });
}
