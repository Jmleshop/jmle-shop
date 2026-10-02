import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import {
  isAuthError,
  requireAdmin,
  staffDataClient,
} from "@/lib/admin-server";
import { resetAndImportBrands } from "@/lib/brand-reset";
import { resolveSupabaseTarget } from "@/lib/supabase-target";

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
 * Marken-Reset auf der DB dieses Deployments (auf Vercel = Production).
 *
 * Auth:
 * - Admin-Session (requireAdmin), oder
 * - Header `x-brand-reset-token` / `Authorization: Bearer …` = BRAND_RESET_TOKEN|CRON_SECRET
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
    let target;
    try {
      target = resolveSupabaseTarget({ production: true });
    } catch (e) {
      // Fallback: Admin-Session mit Staff-Client, aber nur wenn Runtime nicht localhost ist
      const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
      let host = "";
      try {
        host = new URL(url).hostname;
      } catch {
        host = "";
      }
      if (host === "127.0.0.1" || host === "localhost" || !host) {
        return NextResponse.json(
          {
            error:
              e instanceof Error
                ? e.message
                : "Keine Produktions-Supabase-URL (localhost wird abgelehnt).",
          },
          { status: 400 }
        );
      }
      if (!byToken) {
        const auth = await requireAdmin();
        if (isAuthError(auth)) {
          return NextResponse.json(
            { error: auth.error },
            { status: auth.status }
          );
        }
        const staff = staffDataClient(auth.supabase);
        const result = await resetAndImportBrands(staff, {
          targetLabel: `runtime:${host}`,
        });
        bust();
        return NextResponse.json({ ok: true, host, ...result });
      }
      return NextResponse.json(
        {
          error:
            e instanceof Error
              ? e.message
              : "Keine Produktions-Credentials für Token-Reset.",
        },
        { status: 400 }
      );
    }

    const host = new URL(target.url).hostname;
    if (host === "127.0.0.1" || host === "localhost") {
      return NextResponse.json(
        {
          error:
            "Reset abgelehnt: Runtime zeigt auf localhost. Bitte gegen Production-Deploy ausführen.",
        },
        { status: 400 }
      );
    }

    const client = createClient(target.url, target.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const result = await resetAndImportBrands(client, {
      targetLabel: `runtime:${host}`,
    });
    bust();
    return NextResponse.json({ ok: true, host, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Reset fehlgeschlagen";
    console.error("[brands/reset]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
