import { roundMoney } from "@/lib/pricing";

export type AnalyticsPeriod = "day" | "week" | "month" | "year" | "custom";

export type ChartBucket = "hour" | "day" | "week" | "month";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function parseAnalyticsRange(searchParams: URLSearchParams): {
  period: AnalyticsPeriod;
  current: { start: Date; end: Date };
  previous: { start: Date; end: Date };
  bucket: ChartBucket;
} {
  const periodParam = (searchParams.get("period") || "week") as AnalyticsPeriod;
  const period: AnalyticsPeriod = [
    "day",
    "week",
    "month",
    "year",
    "custom",
  ].includes(periodParam)
    ? periodParam
    : "week";

  if (period === "custom") {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const start = from ? startOfDay(new Date(from)) : startOfDay(new Date());
    const end = to ? endOfDay(new Date(to)) : endOfDay(new Date());
    const safeStart = Number.isNaN(start.getTime()) ? startOfDay(new Date()) : start;
    const safeEnd = Number.isNaN(end.getTime()) ? endOfDay(new Date()) : end;
    const span = Math.max(1, safeEnd.getTime() - safeStart.getTime());
    const previousEnd = endOfDay(new Date(safeStart.getTime() - 1));
    const previousStart = startOfDay(new Date(previousEnd.getTime() - span));
    const days = span / 86400000;
    const bucket: ChartBucket =
      days <= 2 ? "hour" : days <= 45 ? "day" : days <= 180 ? "week" : "month";
    return {
      period,
      current: { start: safeStart, end: safeEnd },
      previous: { start: previousStart, end: previousEnd },
      bucket,
    };
  }

  return { period, ...getPeriodRanges(period) };
}

/** Aktueller und Vergleichszeitraum (vorherige Periode gleicher Länge) */
export function getPeriodRanges(
  period: Exclude<AnalyticsPeriod, "custom">,
  now = new Date()
) {
  const currentEnd = endOfDay(now);
  let currentStart: Date;
  let previousStart: Date;
  let previousEnd: Date;
  let bucket: ChartBucket;

  if (period === "day") {
    currentStart = startOfDay(now);
    previousEnd = endOfDay(new Date(now.getTime() - 86400000));
    previousStart = startOfDay(previousEnd);
    bucket = "hour";
  } else if (period === "week") {
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    currentStart = startOfDay(new Date(now));
    currentStart.setDate(currentStart.getDate() + mondayOffset);
    previousEnd = endOfDay(new Date(currentStart.getTime() - 86400000));
    previousStart = startOfDay(new Date(previousEnd));
    previousStart.setDate(previousStart.getDate() - 6);
    bucket = "day";
  } else if (period === "month") {
    currentStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    previousStart = startOfDay(
      new Date(now.getFullYear(), now.getMonth() - 1, 1)
    );
    previousEnd = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
    bucket = "day";
  } else {
    currentStart = startOfDay(new Date(now.getFullYear(), 0, 1));
    previousStart = startOfDay(new Date(now.getFullYear() - 1, 0, 1));
    previousEnd = endOfDay(new Date(now.getFullYear() - 1, 11, 31));
    bucket = "month";
  }

  return {
    current: { start: currentStart, end: currentEnd },
    previous: { start: previousStart, end: previousEnd },
    bucket,
  };
}

export function bucketKey(date: Date, bucket: ChartBucket) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  if (bucket === "hour") {
    return `${y}-${m}-${d} ${String(date.getHours()).padStart(2, "0")}:00`;
  }
  if (bucket === "month") return `${y}-${m}`;
  if (bucket === "week") {
    const tmp = new Date(date);
    const day = tmp.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    tmp.setDate(tmp.getDate() + mondayOffset);
    return `${tmp.getFullYear()}-W${String(tmp.getMonth() + 1).padStart(2, "0")}-${String(tmp.getDate()).padStart(2, "0")}`;
  }
  return `${y}-${m}-${d}`;
}

/** ISO-Range für Klick auf einen Bucket-Punkt */
export function bucketToRange(
  label: string,
  bucket: ChartBucket
): { start: string; end: string } | null {
  try {
    if (bucket === "hour") {
      const start = new Date(label.replace(" ", "T") + ":00");
      if (Number.isNaN(start.getTime())) return null;
      const end = new Date(start.getTime() + 3600000 - 1);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    if (bucket === "month") {
      const [y, m] = label.split("-").map(Number);
      const start = startOfDay(new Date(y, m - 1, 1));
      const end = endOfDay(new Date(y, m, 0));
      return { start: start.toISOString(), end: end.toISOString() };
    }
    if (bucket === "week" && label.includes("-W")) {
      const parts = label.split("-W");
      const y = Number(parts[0]);
      const rest = parts[1]?.split("-") ?? [];
      const mo = Number(rest[0]);
      const day = Number(rest[1]);
      const start = startOfDay(new Date(y, mo - 1, day));
      const end = endOfDay(new Date(start.getTime() + 6 * 86400000));
      return { start: start.toISOString(), end: end.toISOString() };
    }
    // day: YYYY-MM-DD
    const start = startOfDay(new Date(label));
    if (Number.isNaN(start.getTime())) return null;
    return { start: start.toISOString(), end: endOfDay(start).toISOString() };
  } catch {
    return null;
  }
}

export function summarizeOrders(
  orders: { id: string; total: number; created_at: string }[],
  items: {
    order_id: string;
    quantity: number;
    price: number;
    product_id: string;
    product_name: string;
  }[]
) {
  const orderCount = orders.length;
  const revenue = roundMoney(
    orders.reduce((s, o) => s + Number(o.total ?? 0), 0)
  );
  const aov = orderCount > 0 ? roundMoney(revenue / orderCount) : 0;
  const orderIds = new Set(orders.map((o) => o.id));
  const relevantItems = items.filter((i) => orderIds.has(i.order_id));
  const units = relevantItems.reduce((s, i) => s + Number(i.quantity), 0);
  return { orderCount, revenue, aov, units, relevantItems };
}

export function pctChange(cur: number, prev: number) {
  if (prev === 0) return cur > 0 ? 100 : 0;
  return roundMoney(((cur - prev) / prev) * 100);
}

export function inRange(createdAt: string, start: Date, end: Date) {
  const t = new Date(createdAt).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

export function detectDevice(ua: string): "mobile" | "tablet" | "desktop" {
  const u = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(u)) return "tablet";
  if (/mobi|iphone|ipod|android.*mobile|windows phone/i.test(u)) return "mobile";
  return "desktop";
}

export function languageRegion(acceptLanguage: string | null): {
  language: string;
  regionHint: string;
} {
  const raw = (acceptLanguage || "de").split(",")[0]?.trim() || "de";
  const lang = raw.slice(0, 8).toLowerCase();
  let regionHint = "Sonstige";
  if (lang.startsWith("de")) regionHint = "DACH (DE/AT/CH)";
  else if (lang.startsWith("ar")) regionHint = "Arabische Region";
  else if (lang.startsWith("en")) regionHint = "Englischsprachig";
  else if (lang.startsWith("tr")) regionHint = "Türkei / TR";
  else if (lang.startsWith("fr")) regionHint = "Französisch";
  return { language: lang, regionHint };
}
