import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import {
  isAuthError,
  requireAdmin,
} from "@/lib/admin-server";
import { resetAndImportBrands } from "@/lib/brand-reset";
import {
  KNOWN_PRODUCTION_SUPABASE_HOST,
  resolveSupabaseTarget,
} from "@/lib/supabase-target";
import { brandCatalogCount } from "@/lib/brand-catalog";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function bust() {
  try {
    revalidateTag("catalog");
    revalidateTag("brands");
    revalidateTag("products");
    revalidateTag("slides");
  } catch {
    /* ignore */
  }
}

function tokenAuthorized(request: Request): boolean {
  const expected = (
    process.env.BRAND_RESET_TOKEN ||
    process.env.CRON_SECRET ||
    process.env.FORCE_BRAND_RESET_TOKEN ||
    ""
  ).trim();
  if (!expected) return false;
  const header =
    request.headers.get("x-brand-reset-token") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  return Boolean(header) && header === expected;
}

/**
 * GET — Status der Marken auf dem Production-Ziel (ohne Mutation).
 */
export async function GET(request: Request) {
  const byToken = tokenAuthorized(request);
  if (!byToken) {
    const auth = await requireAdmin();
    if (isAuthError(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
  }

  try {
    const target = resolveSupabaseTarget({ production: true });
    const host = new URL(target.url).hostname;
    const supabase = createClient(target.url, target.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { count, error } = await supabase
      .from("brand_logos")
      .select("id", { count: "exact", head: true });
    if (error) {
      return NextResponse.json({ error: error.message, host }, { status: 500 });
    }
    const { data: sample } = await supabase
      .from("brand_logos")
      .select("id, name, sort_order")
      .order("sort_order", { ascending: true })
      .limit(5);

    return NextResponse.json({
      ok: true,
      host,
      expectedBrands: brandCatalogCount(),
      brandCount: count ?? 0,
      sample: sample ?? [],
      knownHost: KNOWN_PRODUCTION_SUPABASE_HOST,
      matchesCatalog: (count ?? 0) === brandCatalogCount(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Status fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST — Unwiderruflicher Marken-Reset auf der Production-DB:
 * löscht alle brand_logos, inseriert exakt 71 Katalog-Marken, rematcht Produkte.
 *
 * Auth: Admin-Session ODER Header x-brand-reset-token / Bearer
 *       (= BRAND_RESET_TOKEN | CRON_SECRET | FORCE_BRAND_RESET_TOKEN)
 *
 * Auf Vercel Production greifen NEXT_PUBLIC_SUPABASE_URL + SERVICE_ROLE (Live).
 */
export async function POST(request: Request) {
  const byToken = tokenAuthorized(request);
  if (!byToken) {
    const auth = await requireAdmin();
    if (isAuthError(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
  }

  try {
    const target = resolveSupabaseTarget({ production: true });
    const host = new URL(target.url).hostname;

    if (host === "127.0.0.1" || host === "localhost") {
      return NextResponse.json(
        {
          error:
            "Force-Reset abgelehnt: Ziel ist localhost. Production-Credentials setzen.",
        },
        { status: 400 }
      );
    }

    if (!host.endsWith(".supabase.co")) {
      return NextResponse.json(
        { error: `Force-Reset abgelehnt: ungültiger Host ${host}` },
        { status: 400 }
      );
    }

    const client = createClient(target.url, target.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    console.info("[force-reset-brands] starting on", host);
    const result = await resetAndImportBrands(client, {
      targetLabel: `force-production:${host}`,
    });
    bust();

    return NextResponse.json({
      ok: true,
      host,
      expectedBrands: brandCatalogCount(),
      ...result,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Force-Reset fehlgeschlagen";
    console.error("[force-reset-brands]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
