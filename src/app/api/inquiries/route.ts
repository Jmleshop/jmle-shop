import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/admin";
import { summarizeLines, type InquiryLine } from "@/lib/inquiry";

const lineSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  vatRate: z.number().nonnegative(),
});

const bodySchema = z.object({
  channel: z.enum(["whatsapp", "callback"]),
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(6),
  email: z.string().trim().email().optional().or(z.literal("")),
  street: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  city: z.string().trim().optional(),
  items: z.array(lineSchema).min(1),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bitte die Pflichtfelder prüfen." }, { status: 400 });
  }

  const data = parsed.data;
  if (data.channel === "callback" && (!data.firstName || !data.lastName)) {
    return NextResponse.json({ error: "Vor- und Nachname sind Pflicht." }, { status: 400 });
  }

  const items = data.items as InquiryLine[];
  const totals = summarizeLines(items);

  try {
    const supabase = createServiceClient();
    const { data: row, error } = await supabase
      .from("inquiries")
      .insert({
        channel: data.channel,
        status: "open",
        first_name: data.firstName || null,
        last_name: data.lastName || null,
        phone: data.phone,
        email: data.email || null,
        street: data.street || null,
        postal_code: data.postalCode || null,
        city: data.city || null,
        items,
        subtotal: totals.subtotal,
        vat_amount: totals.vat,
        total: totals.total,
      })
      .select("id")
      .single();

    if (error || !row) {
      return NextResponse.json({ error: error?.message || "Speichern fehlgeschlagen" }, { status: 500 });
    }
    return NextResponse.json({ id: row.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Speichern fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
