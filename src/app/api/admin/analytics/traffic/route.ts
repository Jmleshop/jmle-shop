import { NextResponse } from "next/server";
import { isAuthError, requireAdmin } from "@/lib/admin-server";
import { bucketKey, parseAnalyticsRange } from "@/lib/analytics-periods";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const ranges = parseAnalyticsRange(searchParams);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: views, error } = await auth.supabase
    .from("page_views")
    .select("id, path, device, language, region_hint, country_code, created_at")
    .gte("created_at", ranges.current.start.toISOString())
    .lte("created_at", ranges.current.end.toISOString())
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    const missing = /relation|does not exist|42P01/i.test(error.message);
    return NextResponse.json(
      {
        error: missing
          ? "Tabelle page_views fehlt — bitte supabase/feature-page-views.sql ausführen."
          : error.message,
        todayViews: 0,
        periodViews: 0,
        devices: [],
        regions: [],
        topPages: [],
        series: [],
      },
      { status: missing ? 200 : 500 }
    );
  }

  const rows = views ?? [];

  const { count: todayCount } = await auth.supabase
    .from("page_views")
    .select("id", { count: "exact", head: true })
    .gte("created_at", todayStart.toISOString());

  const deviceMap = new Map<string, number>();
  const regionMap = new Map<string, number>();
  const pathMap = new Map<string, number>();
  const seriesMap = new Map<string, number>();

  for (const row of rows) {
    deviceMap.set(row.device, (deviceMap.get(row.device) ?? 0) + 1);
    const region =
      row.country_code || row.region_hint || row.language || "Unbekannt";
    regionMap.set(region, (regionMap.get(region) ?? 0) + 1);
    pathMap.set(row.path, (pathMap.get(row.path) ?? 0) + 1);
    const key = bucketKey(new Date(row.created_at), ranges.bucket);
    seriesMap.set(key, (seriesMap.get(key) ?? 0) + 1);
  }

  const devices = [...deviceMap.entries()].map(([name, value]) => ({
    name:
      name === "mobile"
        ? "Smartphone"
        : name === "tablet"
          ? "Tablet"
          : "Desktop",
    value,
  }));

  const regions = [...regionMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  const topPages = [...pathMap.entries()]
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 15);

  const series = Array.from(seriesMap.entries())
    .map(([label, views]) => ({ label, views }))
    .sort((a, b) => a.label.localeCompare(b.label, "de"));

  return NextResponse.json({
    period: ranges.period,
    bucket: ranges.bucket,
    todayViews: todayCount ?? 0,
    periodViews: rows.length,
    devices,
    regions,
    topPages,
    series,
  });
}
