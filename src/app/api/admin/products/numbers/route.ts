import { NextResponse } from "next/server";
import { isAuthError, requireStaff } from "@/lib/admin-server";
import { planProductNumbers, type NumberRow } from "@/lib/product-numbers";

export async function GET() {
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.supabase
    .from("products")
    .select("id, name_ar, product_number, created_at")
    .is("deleted_at", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const plan = planProductNumbers((data ?? []) as NumberRow[]);
  return NextResponse.json({
    dryRun: true,
    plan,
    changes: plan.filter((row) => row.from !== row.to).length,
  });
}

export async function POST(request: Request) {
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { apply?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }
  if (!body.apply) {
    return NextResponse.json({ error: "Nur mit apply: true schreiben" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("products")
    .select("id, name_ar, product_number, created_at")
    .is("deleted_at", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const plan = planProductNumbers((data ?? []) as NumberRow[]);
  let updated = 0;
  const errors: string[] = [];
  for (const row of plan) {
    if (row.from === row.to) continue;
    const result = await auth.supabase
      .from("products")
      .update({ product_number: row.to })
      .eq("id", row.id);
    if (result.error) errors.push(`${row.id}: ${result.error.message}`);
    else updated += 1;
  }

  return NextResponse.json({ updated, errors });
}
