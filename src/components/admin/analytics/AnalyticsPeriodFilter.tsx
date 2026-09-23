"use client";

import { useMemo, useState } from "react";
import type { AnalyticsPeriod } from "@/lib/analytics-periods";
import { cn } from "@/lib/cn";

const PRESETS: { id: Exclude<AnalyticsPeriod, "custom">; label: string }[] = [
  { id: "day", label: "Heute" },
  { id: "week", label: "Diese Woche" },
  { id: "month", label: "Dieser Monat" },
  { id: "year", label: "Dieses Jahr" },
];

export type AnalyticsFilterState = {
  period: AnalyticsPeriod;
  from?: string;
  to?: string;
  /** Optional: Drilldown durch Klick auf Chart-Punkt */
  focusFrom?: string;
  focusTo?: string;
  focusLabel?: string;
};

export function useAnalyticsFilter(initial: AnalyticsPeriod = "week") {
  const [state, setState] = useState<AnalyticsFilterState>({ period: initial });

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set("period", state.period);
    if (state.period === "custom") {
      if (state.from) p.set("from", state.from);
      if (state.to) p.set("to", state.to);
    }
    if (state.focusFrom) p.set("focusFrom", state.focusFrom);
    if (state.focusTo) p.set("focusTo", state.focusTo);
    return p.toString();
  }, [state]);

  return { state, setState, queryString };
}

export default function AnalyticsPeriodFilter({
  value,
  onChange,
}: {
  value: AnalyticsFilterState;
  onChange: (next: AnalyticsFilterState) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-gray-200 bg-white p-1 w-fit max-w-full">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() =>
              onChange({
                period: p.id,
                focusFrom: undefined,
                focusTo: undefined,
                focusLabel: undefined,
              })
            }
            className={cn(
              "px-3 py-2.5 min-h-11 text-xs sm:text-sm rounded-lg transition-colors",
              value.period === p.id && !value.focusLabel
                ? "bg-gold text-white"
                : "hover:bg-gray-50 text-gray-700"
            )}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() =>
            onChange({
              period: "custom",
              from:
                value.from ||
                new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
              to: value.to || new Date().toISOString().slice(0, 10),
              focusFrom: undefined,
              focusTo: undefined,
              focusLabel: undefined,
            })
          }
          className={cn(
            "px-3 py-2.5 min-h-11 text-xs sm:text-sm rounded-lg transition-colors",
            value.period === "custom" && !value.focusLabel
              ? "bg-gold text-white"
              : "hover:bg-gray-50 text-gray-700"
          )}
        >
          Benutzerdefiniert
        </button>
      </div>

      {value.period === "custom" && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-2">
            <span className="text-gray-500">Von</span>
            <input
              type="date"
              className="input-field !min-h-11 !py-2 !w-auto"
              value={value.from || ""}
              onChange={(e) =>
                onChange({ ...value, from: e.target.value, focusLabel: undefined })
              }
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="text-gray-500">Bis</span>
            <input
              type="date"
              className="input-field !min-h-11 !py-2 !w-auto"
              value={value.to || ""}
              onChange={(e) =>
                onChange({ ...value, to: e.target.value, focusLabel: undefined })
              }
            />
          </label>
        </div>
      )}

      {value.focusLabel && (
        <div className="flex flex-wrap items-center gap-2 text-xs bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          <span>
            Filter aktiv: <strong>{value.focusLabel}</strong>
          </span>
          <button
            type="button"
            className="underline text-gold min-h-10 px-2"
            onClick={() =>
              onChange({
                ...value,
                focusFrom: undefined,
                focusTo: undefined,
                focusLabel: undefined,
              })
            }
          >
            Zurücksetzen
          </button>
        </div>
      )}
    </div>
  );
}
