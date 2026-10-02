import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import {
  isAuthError,
  requireAdmin,
  staffDataClient,
} from "@/lib/admin-server";
import { resetAndImportBrands } from "@/lib/brand-reset";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

/**
 * Admin-only: alle Marken löschen, Katalog neu importieren, Produkte matchen.
 * POST /api/admin/brands/reset
 */
export async function POST() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const db = staffDataClient(auth.supabase);
    const result = await resetAndImportBrands(db);
    bust();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Reset fehlgeschlagen";
    console.error("[brands/reset]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
