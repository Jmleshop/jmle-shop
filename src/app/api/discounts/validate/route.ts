import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { roundMoney } from "@/lib/pricing";
import { z } from "zod";
import { parseJsonBody } from "@/lib/validations";

const bodySchema = z.object({
  code: z.string().trim().min(1).max(40),
  subtotal: z.coerce.number().min(0).max(1_000_000),
});

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ valid: false, error: "Ungültiges JSON" }, { status: 400 });
  }

  const parsed = parseJsonBody(bodySchema, raw);
  if (!parsed.success) {
    return NextResponse.json({ valid: false, error: parsed.error }, { status: 400 });
  }

  const code = parsed.data.code.toUpperCase();
  const { subtotal } = parsed.data;

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("discount_codes")
    .select("*")
    .eq("code", code)
    .eq("active", true)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { valid: false, error: "رمز الخصم غير صالح أو منتهي" },
      { status: 404 }
    );
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json(
      { valid: false, error: "انتهت صلاحية رمز الخصم" },
      { status: 400 }
    );
  }

  if (
    data.usage_limit != null &&
    Number(data.usage_count) >= Number(data.usage_limit)
  ) {
    return NextResponse.json(
      { valid: false, error: "تم استنفاد هذا الرمز" },
      { status: 400 }
    );
  }

  let discountAmount = 0;
  if (data.type === "percent") {
    discountAmount = roundMoney(subtotal * (Number(data.value) / 100));
  } else {
    discountAmount = roundMoney(Math.min(Number(data.value), subtotal));
  }

  if (discountAmount <= 0) {
    return NextResponse.json(
      { valid: false, error: "لا يمكن تطبيق الخصم على هذا المبلغ" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    valid: true,
    code: data.code,
    type: data.type,
    value: Number(data.value),
    discountAmount,
  });
}
