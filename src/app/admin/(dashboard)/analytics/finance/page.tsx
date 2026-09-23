"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AnalyticsPeriodFilter, {
  useAnalyticsFilter,
} from "@/components/admin/analytics/AnalyticsPeriodFilter";
import {
  AnalyticsChartCard,
  AnalyticsKpiCard,
} from "@/components/admin/analytics/AnalyticsCards";
import {
  ComparisonBarChart,
  RevenueProfitAreaChart,
} from "@/components/admin/analytics/AnalyticsCharts";
import { bucketToRange, type ChartBucket } from "@/lib/analytics-periods";

type FinancePayload = {
  bucket: ChartBucket;
  metrics: {
    revenue: { value: number; previous: number; changePct: number };
    profit: { value: number; previous: number; changePct: number };
    aov: { value: number; previous: number; changePct: number };
    orders: { value: number; previous: number; changePct: number };
  };
  series: { label: string; revenue: number; profit: number; orders: number }[];
  comparison: { label: string; value: number }[];
};

export default function FinanceAnalyticsPage() {
  const { state, setState, queryString } = useAnalyticsFilter("week");
  const [data, setData] = useState<FinancePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/admin/analytics/finance?${queryString}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Fehler");
        setData(d);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Fehler"))
      .finally(() => setLoading(false));
  }, [queryString]);

  const onPointClick = (label: string) => {
    if (!data) return;
    const range = bucketToRange(label, data.bucket);
    if (!range) return;
    setState({
      ...state,
      focusFrom: range.start,
      focusTo: range.end,
      focusLabel: label,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">
            Analytics
          </p>
          <h1 className="text-2xl font-semibold">Finanz- & Umsatzanalyse</h1>
          <p className="text-sm text-gray-500 mt-1">
            Umsatz, Reingewinn (VK − EK) und Bestellmetriken
          </p>
        </div>
        <nav className="flex flex-wrap gap-2 text-xs">
          <Link
            href="/admin/analytics/finance"
            className="px-3 py-2 rounded-lg bg-gold text-white min-h-10"
          >
            Finanzen
          </Link>
          <Link
            href="/admin/analytics/products"
            className="px-3 py-2 rounded-lg bg-white border min-h-10 hover:bg-gray-50"
          >
            Produkte
          </Link>
          <Link
            href="/admin/analytics/traffic"
            className="px-3 py-2 rounded-lg bg-white border min-h-10 hover:bg-gray-50"
          >
            Traffic
          </Link>
        </nav>
      </div>

      <AnalyticsPeriodFilter value={state} onChange={setState} />

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {loading || !data ? (
        <p className="text-gray-500">…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <AnalyticsKpiCard
              title="Gesamtumsatz"
              value={data.metrics.revenue.value}
              previous={data.metrics.revenue.previous}
              changePct={data.metrics.revenue.changePct}
              money
              accent="gold"
            />
            <AnalyticsKpiCard
              title="Reingewinn"
              value={data.metrics.profit.value}
              previous={data.metrics.profit.previous}
              changePct={data.metrics.profit.changePct}
              money
              accent="emerald"
            />
            <AnalyticsKpiCard
              title="AOV"
              value={data.metrics.aov.value}
              previous={data.metrics.aov.previous}
              changePct={data.metrics.aov.changePct}
              money
            />
            <AnalyticsKpiCard
              title="Bestellungen"
              value={data.metrics.orders.value}
              previous={data.metrics.orders.previous}
              changePct={data.metrics.orders.changePct}
            />
          </div>

          <AnalyticsChartCard
            title="Umsatz vs. Gewinn"
            subtitle="Hover für Details · Klick auf Punkt filtert die KPIs"
          >
            <RevenueProfitAreaChart
              data={data.series}
              onPointClick={onPointClick}
            />
          </AnalyticsChartCard>

          <AnalyticsChartCard
            title="Vergleich (Wochentage / Monate)"
            subtitle="Umsatzverteilung im Zeitraum"
          >
            <ComparisonBarChart data={data.comparison} money name="Umsatz" />
          </AnalyticsChartCard>
        </>
      )}
    </div>
  );
}
