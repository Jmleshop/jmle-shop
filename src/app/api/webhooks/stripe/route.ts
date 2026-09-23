import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Stripe Webhook — strikte Signaturprüfung, Idempotenz über stripe_session_id.
 * Rohbody wird als Text gelesen (kein JSON-Parse vor constructEvent).
 */
export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET fehlt");
    return NextResponse.json({ error: "Webhook misconfigured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("[stripe-webhook] Signature verification failed:", message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (!session.id) {
    return NextResponse.json({ error: "Missing session id" }, { status: 400 });
  }

  let service;
  try {
    service = createServiceClient();
  } catch (err) {
    console.error("[stripe-webhook] Service client:", err);
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // Idempotenz: bei Retry keine doppelte Bestellung
  const { data: existing, error: existingError } = await service
    .from("orders")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  if (existingError) {
    console.error("[stripe-webhook] Idempotency check failed:", existingError);
    return NextResponse.json({ error: "Idempotency check failed" }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const metadata = session.metadata ?? {};
  const itemsJson = metadata.items;
  const userId = metadata.user_id?.trim() || null;
  const discountCode = metadata.discount_code?.trim() || null;
  const discountAmount = Number(metadata.discount_amount || 0);
  const subtotal = Number(metadata.subtotal || 0);

  const { data: order, error: orderError } = await service
    .from("orders")
    .insert({
      user_id: userId,
      stripe_session_id: session.id,
      customer_email:
        session.customer_details?.email ?? session.customer_email ?? null,
      status: "paid",
      subtotal: Number.isFinite(subtotal) ? subtotal : 0,
      discount_amount: Number.isFinite(discountAmount) ? discountAmount : 0,
      total: (session.amount_total ?? 0) / 100,
      discount_code: discountCode,
    })
    .select("id")
    .single();

  if (orderError) {
    // Unique-Violation bei Race (paralleler Retry) → als Erfolg werten
    if (orderError.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error("[stripe-webhook] Order insert error:", orderError);
    return NextResponse.json({ error: "Order creation failed" }, { status: 500 });
  }

  if (!order) {
    return NextResponse.json({ error: "Order creation failed" }, { status: 500 });
  }

  if (itemsJson) {
    try {
      const items = JSON.parse(itemsJson) as Array<{
        productId: string;
        name: string;
        price: number;
        quantity: number;
      }>;

      if (!Array.isArray(items) || items.length === 0) {
        throw new Error("Empty items payload");
      }

      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: String(item.productId),
        product_name: String(item.name ?? ""),
        price: Number(item.price),
        quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
      }));

      const { error: itemsError } = await service
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        console.error("[stripe-webhook] Order items insert:", itemsError);
        return NextResponse.json({ error: "Order items failed" }, { status: 500 });
      }

      const { error: stockError } = await service.rpc("decrement_product_stock", {
        p_items: items.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
        })),
      });

      if (stockError) {
        console.error("[stripe-webhook] Stock decrement:", stockError);
        // Order existiert bereits — 500 damit Stripe erneut liefert und Ops eingreifen können
        return NextResponse.json({ error: "Stock update failed" }, { status: 500 });
      }
    } catch (err) {
      console.error("[stripe-webhook] Order items parse/insert:", err);
      return NextResponse.json({ error: "Invalid items payload" }, { status: 500 });
    }
  }

  if (userId) {
    const { error: cartError } = await service
      .from("cart_items")
      .delete()
      .eq("user_id", userId);
    if (cartError) {
      console.error("[stripe-webhook] Cart clear:", cartError);
    }
  }

  if (discountCode) {
    const { data: code, error: codeError } = await service
      .from("discount_codes")
      .select("id, usage_count")
      .eq("code", discountCode)
      .maybeSingle();

    if (codeError) {
      console.error("[stripe-webhook] Discount lookup:", codeError);
    } else if (code) {
      const { error: usageError } = await service
        .from("discount_codes")
        .update({ usage_count: (code.usage_count ?? 0) + 1 })
        .eq("id", code.id);
      if (usageError) {
        console.error("[stripe-webhook] Discount usage:", usageError);
      }
    }
  }

  return NextResponse.json({ received: true });
}
