import { NextResponse } from "next/server";
import { isAuthError, requireAdmin } from "@/lib/admin-server";
import { roundMoney } from "@/lib/pricing";
import {
  parseAnalyticsRange,
} from "@/lib/analytics-periods";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const ranges = parseAnalyticsRange(searchParams);
  const productId = searchParams.get("productId");

  const { data: orders, error } = await auth.supabase
    .from("orders")
    .select("id, total, status, created_at")
    .eq("status", "paid")
    .gte("created_at", ranges.current.start.toISOString())
    .lte("created_at", ranges.current.end.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orderIds = (orders ?? []).map((o) => o.id);
  if (!orderIds.length) {
    return NextResponse.json({
      bestsellers: [],
      ranking: [],
      detail: null,
    });
  }

  const { data: items } = await auth.supabase
    .from("order_items")
    .select("order_id, product_id, product_name, price, quantity")
    .in("order_id", orderIds);

  const rows = items ?? [];
  const productIds = [...new Set(rows.map((r) => r.product_id))];

  const { data: products } = await auth.supabase
    .from("products")
    .select(
      "id, name_de, name_ar, image, images, purchase_price, stock_quantity, category_id, category:categories(id, name_ar, name_de)"
    )
    .in("id", productIds);

  const productMap = new Map((products ?? []).map((p) => [p.id, p]));

  const agg = new Map<
    string,
    { name: string; units: number; revenue: number; profit: number }
  >();

  for (const row of rows) {
    const p = productMap.get(row.product_id);
    const purchase = Number(p?.purchase_price ?? 0);
    const price = Number(row.price);
    const qty = Number(row.quantity);
    const cur = agg.get(row.product_id) ?? {
      name: row.product_name || p?.name_de || p?.name_ar || row.product_id,
      units: 0,
      revenue: 0,
      profit: 0,
    };
    cur.units += qty;
    cur.revenue = roundMoney(cur.revenue + price * qty);
    cur.profit = roundMoney(cur.profit + (price - purchase) * qty);
    agg.set(row.product_id, cur);
  }

  const totalRevenue = [...agg.values()].reduce((s, a) => s + a.revenue, 0);
  const ranking = [...agg.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.units - a.units);

  const bestsellers = ranking.slice(0, 5).map((r) => ({
    id: r.id,
    name: r.name,
    value: r.revenue,
    pct: totalRevenue > 0 ? roundMoney((r.revenue / totalRevenue) * 100) : 0,
  }));

  let detail = null;
  if (productId) {
    const stats = agg.get(productId);
    const p = productMap.get(productId);
    if (stats && p) {
      const cat = Array.isArray(p.category) ? p.category[0] : p.category;
      const days =
        (ranges.current.end.getTime() - ranges.current.start.getTime()) /
          86400000 || 1;
      const dailyRate = stats.units / days;
      const stock = Number(p.stock_quantity ?? 0);
      const daysLeft =
        dailyRate > 0 ? Math.floor(stock / dailyRate) : stock > 0 ? null : 0;

      detail = {
        id: productId,
        name: stats.name,
        image:
          p.image ||
          (Array.isArray(p.images) && p.images[0]) ||
          "/placeholder.svg",
        category:
          (cat as { name_de?: string; name_ar?: string } | null)?.name_de ||
          (cat as { name_ar?: string } | null)?.name_ar ||
          "—",
        units: stats.units,
        revenue: stats.revenue,
        profit: stats.profit,
        stock,
        dailyRate: roundMoney(dailyRate),
        daysLeft,
        forecast:
          daysLeft == null
            ? "Keine Verkäufe im Zeitraum – Prognose nicht möglich"
            : daysLeft <= 0
              ? "Bestand aufgebraucht oder ausverkauft"
              : `Bei aktueller Verkaufsrate reicht der Bestand noch ca. ${daysLeft} Tage`,
      };
    }
  }

  return NextResponse.json({
    period: ranges.period,
    bestsellers,
    ranking,
    detail,
  });
}
