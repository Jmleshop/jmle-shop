"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatEuroDe } from "@/lib/pricing";
import AnalyticsPeriodFilter, {
  useAnalyticsFilter,
} from "@/components/admin/analytics/AnalyticsPeriodFilter";
import { AnalyticsChartCard } from "@/components/admin/analytics/AnalyticsCards";
import {
  DonutChart,
  HorizontalRankChart,
} from "@/components/admin/analytics/AnalyticsCharts";
import ProductAnalyticsModal, {
  type ProductAnalyticsDetail,
} from "@/components/admin/analytics/ProductAnalyticsModal";

type ProductsPayload = {
  bestsellers: { id: string; name: string; value: number; pct: number }[];
  ranking: { id: string; name: string; units: number; profit: number; revenue: number }[];
  detail: ProductAnalyticsDetail | null;
};

export default function ProductsAnalyticsPage() {
  const { state, setState, queryString } = useAnalyticsFilter("month");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [data, setData] = useState<ProductsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    const qs = selectedId
      ? `${queryString}&productId=${encodeURIComponent(selectedId)}`
      : queryString;
    fetch(`/api/admin/analytics/products?${qs}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Fehler");
        setData(d);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Fehler"))
      .finally(() => setLoading(false));
  }, [queryString, selectedId]);

  const openProduct = (id: string) => setSelectedId(id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">
            Analytics
          </p>
          <h1 className="text-2xl font-semibold">Produktanalyse & Bestseller</h1>
          <p className="text-sm text-gray-500 mt-1">
            Top-Produkte, Stückzahlen und Gewinn — klickbar für Details
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
            className="px-3 py-2 rounded-lg bg-gold text-white min-h-10"
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
          <div className="grid lg:grid-cols-2 gap-4">
            <AnalyticsChartCard
              title="Top-5 Bestseller (Umsatzanteil)"
              subtitle="Donut — Klick öffnet Produktdetail"
            >
              <DonutChart
                data={data.bestsellers.map((b) => ({
                  id: b.id,
                  name: b.name,
                  value: b.value,
                }))}
                onSliceClick={(id) => openProduct(id)}
              />
            </AnalyticsChartCard>
            <AnalyticsChartCard
              title="Ranking nach Stückzahl"
              subtitle="Balken — Klick öffnet Produktdetail"
            >
              <HorizontalRankChart
                data={data.ranking}
                onBarClick={(id) => openProduct(id)}
              />
            </AnalyticsChartCard>
          </div>

          <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="overflow-x-auto max-h-[50vh]">
              <table className="w-full text-sm min-w-[560px]">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-medium">Produkt</th>
                    <th className="text-left p-3 font-medium">Stück</th>
                    <th className="text-left p-3 font-medium">Umsatz</th>
                    <th className="text-left p-3 font-medium">Gewinn</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ranking.map((r) => (
                    <tr
                      key={r.id}
                      className="border-t hover:bg-amber-50/40 cursor-pointer"
                      onClick={() => openProduct(r.id)}
                    >
                      <td className="p-3 font-medium">{r.name}</td>
                      <td className="p-3">{r.units}</td>
                      <td className="p-3">{formatEuroDe(r.revenue)}</td>
                      <td className="p-3 text-emerald-700">
                        {formatEuroDe(r.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <ProductAnalyticsModal
        detail={data?.detail ?? null}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
