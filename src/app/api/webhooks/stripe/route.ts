import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing webhook config" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature error:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const service = createServiceClient();

    const { data: existing } = await service
      .from("orders")
      .select("id")
      .eq("stripe_session_id", session.id)
      .single();

    if (existing) {
      return NextResponse.json({ received: true });
    }

    const metadata = session.metadata ?? {};
    const itemsJson = metadata.items;
    const userId = metadata.user_id || null;
    const discountCode = metadata.discount_code || null;
    const discountAmount = Number(metadata.discount_amount || 0);
    const subtotal = Number(metadata.subtotal || 0);

    const { data: order, error: orderError } = await service
      .from("orders")
      .insert({
        user_id: userId,
        stripe_session_id: session.id,
        customer_email: session.customer_details?.email ?? session.customer_email,
        status: "paid",
        subtotal,
        discount_amount: discountAmount,
        total: (session.amount_total ?? 0) / 100,
        discount_code: discountCode,
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error("Order insert error:", orderError);
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

        const orderItems = items.map((item) => ({
          order_id: order.id,
          product_id: item.productId,
          product_name: item.name,
          price: item.price,
          quantity: item.quantity,
        }));

        await service.from("order_items").insert(orderItems);

        await service.rpc("decrement_product_stock", {
          p_items: items.map((item) => ({
            product_id: item.productId,
            quantity: item.quantity,
          })),
        });
      } catch (err) {
        console.error("Order items error:", err);
      }
    }

    if (userId) {
      await service.from("cart_items").delete().eq("user_id", userId);
    }

    if (discountCode) {
      const { data: code } = await service
        .from("discount_codes")
        .select("usage_count")
        .eq("code", discountCode)
        .single();

      if (code) {
        await service
          .from("discount_codes")
          .update({ usage_count: code.usage_count + 1 })
          .eq("code", discountCode);
      }
    }
  }

  return NextResponse.json({ received: true });
}
