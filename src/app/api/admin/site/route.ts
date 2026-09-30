import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { isAuthError, requireStaff } from "@/lib/admin-server";
import { DEFAULT_SITE_CONFIG } from "@/lib/site-defaults";

function bust() {
  try {
    revalidateTag("catalog");
    revalidateTag("site");
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
    .from("site_settings")
    .select("value")
    .eq("key", "site")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { site: DEFAULT_SITE_CONFIG, hint: error.message },
      { status: 200 }
    );
  }

  const value = (data?.value as Record<string, unknown> | null) ?? {};
  return NextResponse.json({
    site: { ...DEFAULT_SITE_CONFIG, ...value },
  });
}

export async function PUT(request: Request) {
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

  const { data: existing } = await auth.supabase
    .from("site_settings")
    .select("value")
    .eq("key", "site")
    .maybeSingle();

  const prev = (existing?.value as Record<string, unknown> | null) ?? {};
  const next = {
    ...DEFAULT_SITE_CONFIG,
    ...prev,
    ...body,
    zoneLabels: {
      ...(DEFAULT_SITE_CONFIG.zoneLabels ?? {}),
      ...((prev.zoneLabels as Record<string, string> | undefined) ?? {}),
      ...((body.zoneLabels as Record<string, string> | undefined) ?? {}),
    },
  };

  const { data, error } = await auth.supabase
    .from("site_settings")
    .upsert({
      key: "site",
      value: next,
      updated_at: new Date().toISOString(),
    })
    .select("value")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  bust();
  return NextResponse.json({ site: data?.value ?? next });
}
