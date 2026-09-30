import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { isAuthError, requireStaff } from "@/lib/admin-server";
import { DEFAULT_SITE_CONFIG } from "@/lib/site-defaults";
import { normalizeHomepageSections } from "@/lib/homepage-sections";
import { readSiteLogo, writeSiteLogo } from "@/lib/site-logo";

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

  const logo = await readSiteLogo(auth.supabase);

  if (error) {
    return NextResponse.json(
      {
        site: { ...DEFAULT_SITE_CONFIG, logo: logo || DEFAULT_SITE_CONFIG.logo },
        logo,
        hint: error.message,
      },
      { status: 200 }
    );
  }

  const value = (data?.value as Record<string, unknown> | null) ?? {};
  const siteLogo =
    logo ||
    (typeof value.logo === "string" ? value.logo : "") ||
    "";
  return NextResponse.json({
    site: { ...DEFAULT_SITE_CONFIG, ...value, logo: siteLogo },
    logo: siteLogo,
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

  // Logo: eigene Zeile site_logo + Spiegel in site.logo
  let logoUrl =
    typeof body.logo === "string"
      ? body.logo.trim()
      : typeof body.site_logo === "string"
        ? body.site_logo.trim()
        : undefined;
  if (logoUrl !== undefined) {
    const written = await writeSiteLogo(auth.supabase, logoUrl);
    if (written.error) {
      return NextResponse.json({ error: written.error }, { status: 500 });
    }
  } else {
    logoUrl = await readSiteLogo(auth.supabase);
    if (!logoUrl && typeof prev.logo === "string") logoUrl = prev.logo;
  }

  const { logo: _dropLogo, site_logo: _dropKey, ...restBody } = body;
  void _dropLogo;
  void _dropKey;

  const merged = {
    ...DEFAULT_SITE_CONFIG,
    ...prev,
    ...restBody,
    logo: logoUrl || "",
    zoneLabels: {
      ...(DEFAULT_SITE_CONFIG.zoneLabels ?? {}),
      ...((prev.zoneLabels as Record<string, string> | undefined) ?? {}),
      ...((body.zoneLabels as Record<string, string> | undefined) ?? {}),
    },
  };
  const next = {
    ...merged,
    homepageSections: normalizeHomepageSections(
      body.homepageSections ?? prev.homepageSections ?? merged.homepageSections,
      {
        brands: String(merged.brandsSectionTitle ?? ""),
        banner2: String(merged.banner2SectionTitle ?? ""),
        banner3: String(merged.banner3SectionTitle ?? ""),
        categories: String(merged.categoriesSectionTitle ?? ""),
      }
    ),
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
  const site = { ...(data?.value as Record<string, unknown>), logo: logoUrl || "" };
  return NextResponse.json({ site, logo: logoUrl || "" });
}
