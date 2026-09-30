import { NextResponse } from "next/server";
import { isAdminError, requireAdmin } from "@/lib/admin-server";
import {
  applyProductFrameChunk,
  previewProductFrames,
} from "@/lib/reprocess-product-images";
import { createServiceClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

function clientFor(session: SupabaseClient) {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceClient() : session;
}

export async function GET() {
  const auth = await requireAdmin();
  if (isAdminError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const previews = await previewProductFrames(clientFor(auth.supabase), 5);
    return NextResponse.json({ dryRun: true, previews });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Vorschau fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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
      const previews = await previewProductFrames(clientFor(auth.supabase), 5);
      return NextResponse.json({ dryRun: true, previews });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Vorschau fehlgeschlagen";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  try {
    const chunk = await applyProductFrameChunk(
      clientFor(auth.supabase),
      Number(body.offset) || 0,
      2
    );
    return NextResponse.json(chunk);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Zuschneiden fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
