import { NextResponse } from "next/server";
import { isAuthError, requireAdmin } from "@/lib/admin-server";
import { roundMoney } from "@/lib/pricing";
import {
  bucketKey,
  bucketToRange,
  inRange,
  parseAnalyticsRange,
  pctChange,
  summarizeOrders,
} from "@/lib/analytics-periods";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const ranges = parseAnalyticsRange(searchParams);
  const focusFrom = searchParams.get("focusFrom");
  const focusTo = searchParams.get("focusTo");

  const earliest = ranges.previous.start.toISOString();
  const latest = ranges.current.end.toISOString();

  const { data: orders, error } = await auth.supabase
    .from("orders")
    .select("id, total, status, created_at")
    .eq("status", "paid")
    .gte("created_at", earliest)
    .lte("created_at", latest)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    const { data: itemRows } = await auth.supabase
      .from("order_items")
      .select("order_id, product_id, product_name, price, quantity")
      .in("order_id", orderIds);
    items = itemRows ?? [];
  }

  const productIds = [...new Set(items.map((i) => i.product_id))];
  const purchaseMap = new Map<string, number>();
  if (productIds.length) {
    const { data: products } = await auth.supabase
      .from("products")
      .select("id, purchase_price")
      .in("id", productIds);
    for (const p of products ?? []) {
      purchaseMap.set(p.id, Number(p.purchase_price ?? 0));
    }
  }

  const profitForItems = (
    list: typeof items
  ) =>
    roundMoney(
      list.reduce((s, row) => {
        const purchase = purchaseMap.get(row.product_id) ?? 0;
        const margin = Number(row.price) - purchase;
        return s + margin * Number(row.quantity);
      }, 0)
    );

  let currentOrders = allOrders.filter((o) =>
    inRange(o.created_at, ranges.current.start, ranges.current.end)
  );
  const previousOrders = allOrders.filter((o) =>
    inRange(o.created_at, ranges.previous.start, ranges.previous.end)
  );

  if (focusFrom && focusTo) {
    const fStart = new Date(focusFrom);
    const fEnd = new Date(focusTo);
    currentOrders = currentOrders.filter((o) =>
      inRange(o.created_at, fStart, fEnd)
    );
  }

  const current = summarizeOrders(currentOrders, items);
  const previous = summarizeOrders(previousOrders, items);
  const currentProfit = profitForItems(current.relevantItems);
  const previousProfit = profitForItems(previous.relevantItems);

  // Zeitreihe über gesamten current-range (ohne focus), damit Chart klickbar bleibt
  const chartOrders = allOrders.filter((o) =>
    inRange(o.created_at, ranges.current.start, ranges.current.end)
  );
  const seriesMap = new Map<
    string,
    { revenue: number; profit: number; orders: number }
  >();
  for (const o of chartOrders) {
    const key = bucketKey(new Date(o.created_at), ranges.bucket);
    const cur = seriesMap.get(key) ?? { revenue: 0, profit: 0, orders: 0 };
    cur.revenue = roundMoney(cur.revenue + Number(o.total));
    cur.orders += 1;
    seriesMap.set(key, cur);
  }
  for (const [key, cur] of seriesMap) {
    const range = bucketToRange(key, ranges.bucket);
    if (!range) continue;
    const bucketItems = items.filter((i) => {
      const ord = chartOrders.find((o) => o.id === i.order_id);
      if (!ord) return false;
      return inRange(ord.created_at, new Date(range.start), new Date(range.end));
    });
    cur.profit = profitForItems(bucketItems);
    seriesMap.set(key, cur);
  }

  const series = Array.from(seriesMap.entries()).map(([label, v]) => ({
    label,
    revenue: v.revenue,
    profit: v.profit,
    orders: v.orders,
  }));

  // Wochentag / Monat Vergleich
  const compareMap = new Map<string, number>();
  for (const o of chartOrders) {
    const d = new Date(o.created_at);
    let label: string;
    if (ranges.bucket === "month" || ranges.period === "year") {
      label = d.toLocaleString("de-DE", { month: "short" });
    } else if (ranges.bucket === "hour") {
      label = `${String(d.getHours()).padStart(2, "0")}h`;
    } else {
      label = d.toLocaleString("de-DE", { weekday: "short" });
    }
    compareMap.set(label, roundMoney((compareMap.get(label) ?? 0) + Number(o.total)));
  }
  const comparison = Array.from(compareMap.entries()).map(([label, value]) => ({
    label,
    value,
  }));

  return NextResponse.json({
    period: ranges.period,
    bucket: ranges.bucket,
    metrics: {
      revenue: {
        value: current.revenue,
        previous: previous.revenue,
        changePct: pctChange(current.revenue, previous.revenue),
      },
      profit: {
        value: currentProfit,
        previous: previousProfit,
        changePct: pctChange(currentProfit, previousProfit),
      },
      aov: {
        value: current.aov,
        previous: previous.aov,
        changePct: pctChange(current.aov, previous.aov),
      },
      orders: {
        value: current.orderCount,
        previous: previous.orderCount,
        changePct: pctChange(current.orderCount, previous.orderCount),
      },
    },
    series,
    comparison,
  });
}
