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
  DonutChart,
} from "@/components/admin/analytics/AnalyticsCharts";

type TrafficPayload = {
  todayViews: number;
  periodViews: number;
  devices: { name: string; value: number }[];
  regions: { label: string; value: number }[];
  topPages: { path: string; views: number }[];
  error?: string;
};

export default function TrafficAnalyticsPage() {
  const { state, setState, queryString } = useAnalyticsFilter("week");
  const [data, setData] = useState<TrafficPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/admin/analytics/traffic?${queryString}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok && d.error) throw new Error(d.error);
        setData(d);
        if (d.error) setError(d.error);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Fehler"))
      .finally(() => setLoading(false));
  }, [queryString]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">
            Analytics
          </p>
          <h1 className="text-2xl font-semibold">Webseiten- & Besucheranalyse</h1>
          <p className="text-sm text-gray-500 mt-1">
            Anonymes In-House-Tracking (keine IP, keine User-ID)
          </p>
        </div>
        <nav className="flex flex-wrap gap-2 text-xs">
          <Link
            href="/admin/analytics/finance"
            className="px-3 py-2 rounded-lg bg-white border min-h-10 hover:bg-gray-50"
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
            className="px-3 py-2 rounded-lg bg-gold text-white min-h-10"
          >
            Traffic
          </Link>
        </nav>
      </div>

      <AnalyticsPeriodFilter value={state} onChange={setState} />

      {error && (
        <p className="text-amber-800 text-sm bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {loading || !data ? (
        <p className="text-gray-500">…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 max-w-lg">
            <AnalyticsKpiCard
              title="Aufrufe heute"
              value={data.todayViews}
              accent="gold"
            />
            <AnalyticsKpiCard
              title="Aufrufe im Zeitraum"
              value={data.periodViews}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <AnalyticsChartCard title="Geräteverteilung">
              <DonutChart data={data.devices} />
            </AnalyticsChartCard>
            <AnalyticsChartCard title="Region / Sprache">
              <ComparisonBarChart
                data={data.regions}
                name="Aufrufe"
              />
            </AnalyticsChartCard>
          </div>

          <AnalyticsChartCard title="Top-Seiten (auch ohne Kauf)">
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="pb-2 font-medium">Pfad</th>
                    <th className="pb-2 font-medium">Aufrufe</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topPages.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-6 text-gray-400 text-center">
                        Noch keine Seitenaufrufe erfasst
                      </td>
                    </tr>
                  ) : (
                    data.topPages.map((p) => (
                      <tr key={p.path} className="border-t">
                        <td className="py-2 font-mono text-xs sm:text-sm">
                          {p.path}
                        </td>
                        <td className="py-2 tabular-nums">{p.views}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </AnalyticsChartCard>
        </>
      )}
    </div>
  );
}
