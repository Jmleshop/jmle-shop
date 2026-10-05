import { NextResponse } from "next/server";
import { isAdminError, requireAdmin } from "@/lib/admin-server";
import { applyWatermarkChunk } from "@/lib/watermark-product-images";
import { createServiceClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

function clientFor(session: SupabaseClient) {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceClient() : session;
}

/** Vorschau / Status */
export async function GET() {
  const auth = await requireAdmin();
  if (isAdminError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const chunk = await applyWatermarkChunk(clientFor(auth.supabase), 0, 0);
    return NextResponse.json({
      dryRun: true,
      total: chunk.total,
      enabled: chunk.enabled,
    });
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Status fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST { apply: true, offset?: number }
 * Wendet Wasserzeichen chunk-weise auf alle Produktbilder an.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (isAdminError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { apply?: boolean; offset?: number } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (!body.apply) {
    try {
      const chunk = await applyWatermarkChunk(clientFor(auth.supabase), 0, 0);
      return NextResponse.json({
        dryRun: true,
        total: chunk.total,
        enabled: chunk.enabled,
      });
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Status fehlgeschlagen";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  try {
    const chunk = await applyWatermarkChunk(
      clientFor(auth.supabase),
      Number(body.offset) || 0,
      3
    );
    return NextResponse.json(chunk);
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Wasserzeichen fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
