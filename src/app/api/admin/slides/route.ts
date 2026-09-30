import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { isAuthError, requireStaff } from "@/lib/admin-server";
import type { SliderZone } from "@/types";

function bust() {
  try {
    revalidateTag("catalog");
    revalidateTag("slides");
    revalidateTag("brands");
  } catch {
    /* ignore */
  }
}

export async function GET(request: Request) {
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const zone = searchParams.get("zone") as SliderZone | null;

  let query = auth.supabase
    .from("hero_slides")
    .select("*")
    .order("sort_order", { ascending: true });

  if (zone === "banner1" || zone === "banner2") {
    query = query.eq("slider_zone", zone);
  }

  const { data, error } = await query;
  if (error) {
    // Fallback ohne neue Spalten
    const basic = await auth.supabase
      .from("hero_slides")
      .select("*")
      .order("sort_order", { ascending: true });
    if (basic.error) {
      return NextResponse.json({ error: basic.error.message }, { status: 500 });
    }
    let rows = basic.data ?? [];
    if (zone === "banner2") rows = [];
    return NextResponse.json({ slides: rows });
  }

  return NextResponse.json({ slides: data ?? [] });
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
    return NextResponse.json({ error: "Bild ist Pflicht" }, { status: 400 });
  }

  const zone: SliderZone =
    body.slider_zone === "banner2" ? "banner2" : "banner1";
  const id =
    String(body.id ?? "").trim() ||
    `slide-${zone}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const titleAr = String(body.title_ar ?? body.title ?? "").trim();
  const titleDe = String(body.title_de ?? "").trim();
  const subtitleAr = String(body.subtitle_ar ?? body.subtitle ?? "").trim();
  const subtitleDe = String(body.subtitle_de ?? "").trim();

  const payload = {
    id,
    image,
    title: titleAr || titleDe || "Banner",
    subtitle: subtitleAr || subtitleDe || "",
    title_ar: titleAr || null,
    title_de: titleDe || null,
    subtitle_ar: subtitleAr || null,
    subtitle_de: subtitleDe || null,
    link_url: String(body.link_url ?? "").trim() || null,
    link_category_id: String(body.link_category_id ?? "").trim() || null,
    slider_zone: zone,
    sort_order: Number(body.sort_order ?? 0) || 0,
    active: body.active !== false,
  };

  const { data, error } = await auth.supabase
    .from("hero_slides")
    .upsert(payload)
    .select()
    .single();

  if (error) {
    // Minimal-Payload für ältere Schemas
    const legacy = {
      id,
      image,
      title: payload.title,
      subtitle: payload.subtitle,
      sort_order: payload.sort_order,
      active: payload.active,
    };
    const retry = await auth.supabase
      .from("hero_slides")
      .upsert(legacy)
      .select()
      .single();
    if (retry.error) {
      return NextResponse.json({ error: retry.error.message }, { status: 500 });
    }
    bust();
    return NextResponse.json({ slide: retry.data });
  }

  bust();
  return NextResponse.json({ slide: data });
}

export async function PUT(request: Request) {
  return POST(request);
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
      .from("hero_slides")
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

  const { error } = await auth.supabase.from("hero_slides").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  bust();
  return NextResponse.json({ success: true });
}
