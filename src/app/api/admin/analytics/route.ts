import { NextResponse } from "next/server";
import { isAuthError, requireAdmin } from "@/lib/admin-server";
import { roundMoney } from "@/lib/pricing";
import {
  bucketKey,
  parseAnalyticsRange,
  pctChange,
  summarizeOrders,
  inRange,
} from "@/lib/analytics-periods";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const ranges = parseAnalyticsRange(searchParams);
  const earliest = ranges.previous.start.toISOString();

  const { data: orders, error: ordersError } = await auth.supabase
    .from("orders")
    .select("id, total, status, created_at")
    .eq("status", "paid")
    .gte("created_at", earliest)
    .lte("created_at", ranges.current.end.toISOString())
    .order("created_at", { ascending: true });

  if (ordersError) {
    return NextResponse.json({ error: ordersError.message }, { status: 500 });
  }

  const allOrders = orders ?? [];
  const orderIds = allOrders.map((o) => o.id);

  let items: {
    order_id: string;
    product_id: string;
    product_name: string;
    price: number;
    quantity: number;
  }[] = [];

  if (orderIds.length) {
    const { data: itemRows, error: itemsError } = await auth.supabase
      .from("order_items")
      .select("order_id, product_id, product_name, price, quantity")
      .in("order_id", orderIds);

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }
    items = itemRows ?? [];
  }

  const currentOrders = allOrders.filter((o) =>
    inRange(o.created_at, ranges.current.start, ranges.current.end)
  );
  const previousOrders = allOrders.filter((o) =>
    inRange(o.created_at, ranges.previous.start, ranges.previous.end)
  );

  const current = summarizeOrders(currentOrders, items);
  const previous = summarizeOrders(previousOrders, items);

  const seriesMap = new Map<string, number>();
  for (const o of currentOrders) {
    const key = bucketKey(new Date(o.created_at), ranges.bucket);
    seriesMap.set(key, roundMoney((seriesMap.get(key) ?? 0) + Number(o.total)));
  }
  const series = Array.from(seriesMap.entries()).map(([label, revenue]) => ({
    label,
    revenue,
  }));

  const productAgg = new Map<
    string,
    { name: string; units: number; revenue: number }
  >();
  for (const row of current.relevantItems) {
    const cur = productAgg.get(row.product_id) ?? {
      name: row.product_name,
      units: 0,
      revenue: 0,
    };
    cur.units += Number(row.quantity);
    cur.revenue = roundMoney(
      cur.revenue + Number(row.price) * Number(row.quantity)
    );
    productAgg.set(row.product_id, cur);
  }
  const bestsellers = Array.from(productAgg.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const productIds = [...productAgg.keys()];
  const categoryRevenue: {
    id: string;
    name: string;
    revenue: number;
    units: number;
  }[] = [];

  if (productIds.length) {
    const { data: products } = await auth.supabase
      .from("products")
      .select("id, category_id, category:categories(id, name_ar, name_de)")
      .in("id", productIds);

    const byCat = new Map<
      string,
      { name: string; revenue: number; units: number }
    >();

    for (const p of products ?? []) {
      const agg = productAgg.get(p.id);
      if (!agg) continue;
      const cat = Array.isArray(p.category) ? p.category[0] : p.category;
      const catId =
        (cat as { id?: string } | null)?.id ?? p.category_id ?? "none";
      const catName =
        (cat as { name_de?: string; name_ar?: string } | null)?.name_de ||
        (cat as { name_ar?: string } | null)?.name_ar ||
        "Ohne Kategorie";
      const cur = byCat.get(catId) ?? { name: catName, revenue: 0, units: 0 };
      cur.revenue = roundMoney(cur.revenue + agg.revenue);
      cur.units += agg.units;
      byCat.set(catId, cur);
    }

    categoryRevenue.push(
      ...Array.from(byCat.entries())
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.revenue - a.revenue)
    );
  }

  return NextResponse.json({
    period: ranges.period,
    ranges: {
      current: {
        start: ranges.current.start.toISOString(),
        end: ranges.current.end.toISOString(),
      },
      previous: {
        start: ranges.previous.start.toISOString(),
        end: ranges.previous.end.toISOString(),
      },
    },
    metrics: {
      orders: {
        value: current.orderCount,
        previous: previous.orderCount,
        changePct: pctChange(current.orderCount, previous.orderCount),
      },
      revenue: {
        value: current.revenue,
        previous: previous.revenue,
        changePct: pctChange(current.revenue, previous.revenue),
      },
      aov: {
        value: current.aov,
        previous: previous.aov,
        changePct: pctChange(current.aov, previous.aov),
      },
      units: {
        value: current.units,
        previous: previous.units,
        changePct: pctChange(current.units, previous.units),
      },
    },
    series,
    bestsellers,
    categoryRevenue,
  });
}
