import { NextResponse } from "next/server";
import { isAuthError, requireAdmin } from "@/lib/admin-server";
import type { AuditLogEntry } from "@/types";

export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const userIds = [
    ...new Set(rows.map((r) => r.user_id).filter(Boolean)),
  ] as string[];

  const { data: profiles } =
    userIds.length > 0
      ? await auth.supabase
          .from("profiles")
          .select("id, email, full_name, first_name, last_name")
          .in("id", userIds)
      : { data: [] as { id: string; email: string; full_name?: string; first_name?: string; last_name?: string }[] };

  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

  const entries: AuditLogEntry[] = rows.map((row) => ({
    ...row,
    user_email: row.user_email || (row.user_id ? byId.get(row.user_id)?.email : null) || null,
    actor: row.user_id ? byId.get(row.user_id) ?? null : null,
  }));

  return NextResponse.json({ entries });
}
