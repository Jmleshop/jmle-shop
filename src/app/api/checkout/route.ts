import { NextResponse } from "next/server";
import { getStripe, formatAmountForStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { getProductsAsync } from "@/lib/catalog-server";

interface CheckoutItem {
  productId: string;
  quantity: number;
}

export async function POST(request: Request) {
  try {
    const { items, discountCode } = (await request.json()) as {
      items: CheckoutItem[];
      discountCode?: string;
    };

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No items" }, { status: 400 });
    }

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

      validatedItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
      });
    }

    let subtotal = validatedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
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
        .single();

      if (code) {
        const expired =
          code.expires_at && new Date(code.expires_at) < new Date();
        const limitReached =
          code.usage_limit !== null && code.usage_count >= code.usage_limit;

        if (!expired && !limitReached) {
          if (code.type === "percent") {
            discountAmount = subtotal * (Number(code.value) / 100);
          } else {
            discountAmount = Math.min(Number(code.value), subtotal);
          }
          appliedCode = code.code;
        }
      }
    }

    const total = Math.max(0, subtotal - discountAmount);
    const discountRatio = subtotal > 0 ? total / subtotal : 1;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Lagerabzug atomar nach Zahlung: Webhook ruft decrement_product_stock auf.
    const stripe = getStripe();

    const lineItems = validatedItems.map((item) => ({
      price_data: {
        currency: "eur",
        product_data: { name: item.name },
        unit_amount: formatAmountForStripe(item.price * discountRatio),
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cart`,
      locale: "de",
      metadata: {
        user_id: user?.id ?? "",
        subtotal: subtotal.toFixed(2),
        discount_amount: discountAmount.toFixed(2),
        discount_code: appliedCode ?? "",
        items: JSON.stringify(validatedItems),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
