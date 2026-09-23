import { NextResponse } from "next/server";
import { isAdminError, requireAdmin } from "@/lib/admin-server";
import { createServiceClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireAdmin();
  if (isAdminError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const service = createServiceClient();

  const { data: profiles, error: profilesError } = await service
    .from("profiles")
    .select("id, first_name, last_name, email, role, created_at")
    .order("created_at", { ascending: false });

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  return NextResponse.json({ users: profiles });
}
