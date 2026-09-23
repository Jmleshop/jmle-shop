import { NextResponse } from "next/server";
import { isAuthError, requireAdmin } from "@/lib/admin-server";
import { discountedPrice } from "@/lib/pricing";

export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let { data: products, error } = await auth.supabase
    .from("products")
    .select("id, name_de, name_ar, price, purchase_price, discount_percent, status")
    .is("deleted_at", null);

  if (error && /status/i.test(error.message)) {
    const retry = await auth.supabase
      .from("products")
      .select("id, name_de, name_ar, price, purchase_price, discount_percent")
      .is("deleted_at", null);
    products = retry.data as typeof products;
    error = retry.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: items } = await auth.supabase
    .from("order_items")
    .select("product_id, price, quantity");

  const sold = new Map<string, { qty: number; revenue: number }>();
  for (const row of items ?? []) {
    const cur = sold.get(row.product_id) ?? { qty: 0, revenue: 0 };
    cur.qty += Number(row.quantity);
    cur.revenue += Number(row.price) * Number(row.quantity);
    sold.set(row.product_id, cur);
  }

  const rows = (products ?? [])
    .filter((p) => (p.status ?? "published") !== "draft")
    .map((p) => {
      const purchase = Number(p.purchase_price ?? 0);
      const listPrice = Number(p.price ?? 0);
      const discount = Number(p.discount_percent ?? 0);
      const effective = discountedPrice(listPrice, discount);
      const margin = effective - purchase;
      const marginPct = effective > 0 ? (margin / effective) * 100 : null;
      const s = sold.get(p.id);
      const profit = s ? s.qty * margin : 0;
      return {
        id: p.id,
        name_de: p.name_de || p.name_ar,
        price: listPrice,
        effective_price: effective,
        purchase_price: purchase,
        margin,
        margin_percent: marginPct,
        units_sold: s?.qty ?? 0,
        profit,
      };
    });

  const totalProfit = rows.reduce((sum, r) => sum + r.profit, 0);
  return NextResponse.json({ rows, totalProfit });
}
