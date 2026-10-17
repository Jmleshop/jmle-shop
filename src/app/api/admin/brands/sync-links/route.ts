import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { isAuthError, requireAdmin } from "@/lib/admin-server";
import { syncProductBrandLinks } from "@/lib/brand-link";
import { resolveRuntimeSupabaseTarget } from "@/lib/supabase-target";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function bust() {
  try {
    revalidateTag("catalog");
    revalidateTag("brands");
    revalidateTag("products");
  } catch {
    /* ignore */
  }
}

function tokenAuthorized(request: Request): boolean {
  const expected = (
    process.env.BRAND_RESET_TOKEN ||
    process.env.CRON_SECRET ||
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
 * Soft-sync: writes products.brand_id from name/alias matching.
 * Keeps existing brand_logos (logos untouched).
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
    const target = resolveRuntimeSupabaseTarget();
    const host = new URL(target.url).hostname;
    const client = createClient(target.url, target.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const result = await syncProductBrandLinks(client);
    bust();
    return NextResponse.json({
      ok: true,
      host,
      label: target.label,
      ...result,
      // Keep response small for large catalogs
      matches: result.matches.slice(0, 50),
      matchesTruncated: result.matches.length > 50,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync fehlgeschlagen";
    console.error("[brands/sync-links]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
