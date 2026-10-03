import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import {
  isAuthError,
  requireAdmin,
} from "@/lib/admin-server";
import { resetAndImportBrands } from "@/lib/brand-reset";
import { resolveRuntimeSupabaseTarget } from "@/lib/supabase-target";
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
 * Marken-Reset auf der Runtime-DB dieses Deployments.
 * Standard-Credentials: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
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

    const result = await resetAndImportBrands(client, {
      targetLabel: `runtime:${host}`,
    });
    bust();
    return NextResponse.json({
      ok: true,
      host,
      label: target.label,
      hint: target.hint,
      expectedBrands: brandCatalogCount(),
      ...result,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Reset fehlgeschlagen";
    console.error("[brands/reset]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
