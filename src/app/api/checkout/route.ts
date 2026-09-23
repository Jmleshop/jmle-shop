import { NextResponse } from "next/server";
import { getStripe, formatAmountForStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { getProductsAsync } from "@/lib/catalog-server";
import { checkoutSchema } from "@/lib/validations/checkout";
import { parseJsonBody } from "@/lib/validations";
import { estimateShipping } from "@/lib/shipping";
import { maxBuyQuantity, roundMoney } from "@/lib/pricing";

export async function POST(request: Request) {
  try {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
    }

    const parsed = parseJsonBody(checkoutSchema, raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { items, discountCode } = parsed.data;

    const products = await getProductsAsync();
    const productMap = new Map(products.map((p) => [p.id, p]));

    const validatedItems: Array<{
      productId: string;
      name: string;
      price: number;
      quantity: number;
    }> = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return NextResponse.json(
          { error: `Produkt nicht gefunden: ${item.productId}` },
          { status: 400 }
        );
      }

      if (!product.inStock) {
        return NextResponse.json(
          { error: `Nicht auf Lager: ${product.name}` },
          { status: 400 }
        );
      }

      if (product.stock !== undefined && product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Nicht genug Bestand für ${product.name}` },
          { status: 400 }
        );
      }

      const maxQty = maxBuyQuantity(
        product.stock ?? 0,
        product.maxOrderQuantity
      );
      if (item.quantity > maxQty) {
        return NextResponse.json(
          { error: `Maximale Bestellmenge für ${product.name}: ${maxQty}` },
          { status: 400 }
        );
      }

      validatedItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
      });
    }

    const subtotal = roundMoney(
      validatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    );
    let discountAmount = 0;
    let appliedCode: string | null = null;

    if (discountCode) {
      const supabase = await createClient();
      const { data: code } = await supabase
        .from("discount_codes")
        .select("*")
        .eq("code", discountCode.toUpperCase())
        .eq("active", true)
        .maybeSingle();

      if (code) {
        const expired =
          code.expires_at && new Date(code.expires_at) < new Date();
        const limitReached =
          code.usage_limit !== null && code.usage_count >= code.usage_limit;

        if (!expired && !limitReached) {
          if (code.type === "percent") {
            discountAmount = roundMoney(subtotal * (Number(code.value) / 100));
          } else {
            discountAmount = roundMoney(Math.min(Number(code.value), subtotal));
          }
          appliedCode = code.code;
        }
      }
    }

    const afterDiscount = Math.max(0, roundMoney(subtotal - discountAmount));
    const shipping = estimateShipping(afterDiscount);
    const discountRatio = subtotal > 0 ? afterDiscount / subtotal : 1;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const stripe = getStripe();
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    if (!appUrl) {
      return NextResponse.json({ error: "App-URL fehlt" }, { status: 500 });
    }

    const lineItems = validatedItems.map((item) => ({
      price_data: {
        currency: "eur",
        product_data: { name: item.name },
        unit_amount: formatAmountForStripe(item.price * discountRatio),
      },
      quantity: item.quantity,
    }));

    if (shipping > 0) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: { name: "Versand / الشحن" },
          unit_amount: formatAmountForStripe(shipping),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/cart`,
      locale: "de",
      shipping_address_collection: {
        allowed_countries: ["DE", "AT", "CH"],
      },
      metadata: {
        user_id: user?.id ?? "",
        subtotal: subtotal.toFixed(2),
        discount_amount: discountAmount.toFixed(2),
        discount_code: appliedCode ?? "",
        shipping_amount: shipping.toFixed(2),
        items: JSON.stringify(validatedItems),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
