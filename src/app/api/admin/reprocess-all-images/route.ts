import { NextResponse } from "next/server";
import { isAdminError, requireAdmin } from "@/lib/admin-server";
import { reprocessAllProductImages } from "@/lib/reprocess-product-images";
import { createServiceClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  const auth = await requireAdmin();
  if (isAdminError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createServiceClient()
      : auth.supabase;
    const summary = await reprocessAllProductImages(supabase);
    return NextResponse.json(summary);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Zuschneiden fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
