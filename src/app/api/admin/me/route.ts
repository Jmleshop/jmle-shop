import { NextResponse } from "next/server";
import { isAuthError, requireStaff } from "@/lib/admin-server";

export async function GET() {
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("id, email, role, full_name, first_name, last_name")
    .eq("id", auth.user.id)
    .maybeSingle();

  return NextResponse.json({
    user: { id: auth.user.id, email: auth.user.email },
    profile,
    role: auth.role,
  });
}
