"use client";

import { formatEuroDe } from "@/lib/pricing";
import { cn } from "@/lib/cn";

export function AnalyticsKpiCard({
  title,
  value,
  previous,
  changePct,
  money,
  accent,
}: {
  title: string;
  value: number;
  previous?: number;
  changePct?: number;
  money?: boolean;
  accent?: "gold" | "emerald" | "ink";
}) {
  const up = (changePct ?? 0) >= 0;
  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm",
        accent === "gold" && "ring-1 ring-gold/20",
        accent === "emerald" && "ring-1 ring-emerald-500/15"
      )}
    >
      <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">
        {title}
      </p>
      <p className="text-xl sm:text-2xl font-semibold tabular-nums text-gray-900">
        {money ? formatEuroDe(value) : value.toLocaleString("de-DE")}
      </p>
      {changePct != null && (
        <p
          className={cn(
            "text-xs mt-2 font-medium",
            up ? "text-emerald-600" : "text-red-600"
          )}
        >
          {up ? "▲" : "▼"} {Math.abs(changePct).toFixed(1)}% vs. Vorperiode
          {previous != null && (
            <span className="text-gray-400 font-normal">
              {" "}
              · {money ? formatEuroDe(previous) : previous}
            </span>
          )}
        </p>
      )}
    </div>
  );
}

export function AnalyticsChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm",
        className
      )}
    >
      <div className="mb-4">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}
