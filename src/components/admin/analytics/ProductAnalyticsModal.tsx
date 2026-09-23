"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { formatEuroDe } from "@/lib/pricing";

export type ProductAnalyticsDetail = {
  id: string;
  name: string;
  image: string;
  category: string;
  units: number;
  revenue: number;
  profit: number;
  stock: number;
  dailyRate: number;
  daysLeft: number | null;
  forecast: string;
};

export default function ProductAnalyticsModal({
  detail,
  onClose,
}: {
  detail: ProductAnalyticsDetail | null;
  onClose: () => void;
}) {
  if (!detail) return null;

  return (
    <div
      className="fixed inset-0 z-[220] bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Produktdetails"
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-up">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold text-sm">Produktdetail</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 min-h-11 min-w-11 rounded-lg hover:bg-gray-100"
            aria-label="Schließen"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-4">
            <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-gray-100 shrink-0">
              <Image
                src={detail.image}
                alt={detail.name}
                fill
                className="object-cover"
                sizes="96px"
              />
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-gray-900">{detail.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{detail.category}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-[11px] text-gray-500">Verkauft</p>
              <p className="font-semibold tabular-nums">{detail.units} Stk.</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-[11px] text-gray-500">Umsatz</p>
              <p className="font-semibold tabular-nums">
                {formatEuroDe(detail.revenue)}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3">
              <p className="text-[11px] text-emerald-700">Gewinn</p>
              <p className="font-semibold tabular-nums text-emerald-800">
                {formatEuroDe(detail.profit)}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-[11px] text-gray-500">Lagerbestand</p>
              <p className="font-semibold tabular-nums">{detail.stock}</p>
            </div>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-sm">
            <p className="text-[11px] uppercase tracking-wide text-amber-800 mb-1">
              Lager-Prognose
            </p>
            <p className="text-gray-800">{detail.forecast}</p>
            <p className="text-xs text-gray-500 mt-1">
              Ø {detail.dailyRate} Stück/Tag im gewählten Zeitraum
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
