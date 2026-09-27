import { NextResponse } from "next/server";
import { isAuthError, requireStaff } from "@/lib/admin-server";
import { PRODUCT_SELECT, PRODUCT_SELECT_BASE } from "@/lib/admin-payloads";
import { parseCsv, previewCsvEdits } from "@/lib/admin-catalog-io";
import type { FoodProduct } from "@/types";

export async function POST(request: Request) {
  const auth = await requireStaff();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { csv?: string; apply?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  const rows = parseCsv(String(body.csv ?? ""));
  let { data, error } = await auth.supabase.from("products").select(PRODUCT_SELECT);
  if (error && /(status|badges|custom_note)/i.test(error.message)) {
    const retry = await auth.supabase.from("products").select(PRODUCT_SELECT_BASE);
    data = retry.data as typeof data;
    error = retry.error;
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const preview = previewCsvEdits((data ?? []) as unknown as FoodProduct[], rows);
  if (!body.apply) return NextResponse.json(preview);

  let applied = 0;
  const applyErrors: string[] = [];
  for (const update of preview.updates) {
    const result = await auth.supabase.from("products").update(update.fields).eq("id", update.id);
    if (result.error) applyErrors.push(`${update.id}: ${result.error.message}`);
    else applied += 1;
  }

  return NextResponse.json({ ...preview, applied, applyErrors });
}
