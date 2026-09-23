"use client";

import { useEffect, useState } from "react";
import { formatEuroDe } from "@/lib/pricing";
import { useAdminI18n } from "@/components/admin/AdminI18n";

interface Row {
  id: string;
  name_de: string;
  price: number;
  effective_price: number;
  purchase_price: number;
  margin: number;
  margin_percent: number | null;
  units_sold: number;
  profit: number;
}

export default function AnalyticsPage() {
  const { t } = useAdminI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d) => {
        setRows(d.rows ?? []);
        setTotal(d.totalProfit ?? 0);
      });
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">{t("analytics")}</h1>
      <p className="text-sm text-gray-500 mb-6">
        Gesamtgewinn (bisherige Verkäufe):{" "}
        <strong>{formatEuroDe(total)}</strong>
      </p>
      <div className="bg-white rounded-2xl border overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-4">Produkt</th>
              <th className="text-left p-4">Listenpreis</th>
              <th className="text-left p-4">Effektiver VK</th>
              <th className="text-left p-4">EK</th>
              <th className="text-left p-4">Gewinn / Stk.</th>
              <th className="text-left p-4">Marge %</th>
              <th className="text-left p-4">Verkauft</th>
              <th className="text-left p-4">Gewinn</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-4 font-medium">{r.name_de}</td>
                <td className="p-4">{formatEuroDe(r.price)}</td>
                <td className="p-4">{formatEuroDe(r.effective_price)}</td>
                <td className="p-4">{formatEuroDe(r.purchase_price)}</td>
                <td className="p-4">{formatEuroDe(r.margin)}</td>
                <td className="p-4">
                  {r.margin_percent != null ? `${r.margin_percent.toFixed(1)} %` : "—"}
                </td>
                <td className="p-4">{r.units_sold}</td>
                <td className="p-4">{formatEuroDe(r.profit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
