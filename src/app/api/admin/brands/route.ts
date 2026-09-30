import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { isAuthError, requireStaff } from "@/lib/admin-server";

function bust() {
  try {
    revalidateTag("catalog");
    revalidateTag("slides");
    revalidateTag("brands");
  } catch {
    /* ignore */
  }
}

export async function GET() {
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.supabase
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

  const id =
    String(body.id ?? "").trim() ||
    `brand-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const payload = {
    id,
    name: String(body.name ?? "").trim(),
    image,
    link_url: String(body.link_url ?? "").trim() || null,
    sort_order: Number(body.sort_order ?? 0) || 0,
    active: body.active !== false,
  };

  const { data, error } = await auth.supabase
    .from("brand_logos")
    .upsert(payload)
    .select()
    .single();

  if (error) {
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
    await auth.supabase
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

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  }

  const { error } = await auth.supabase.from("brand_logos").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  bust();
  return NextResponse.json({ success: true });
}
