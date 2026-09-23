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
  trading,
}: {
  title: string;
  value: number;
  previous?: number;
  changePct?: number;
  money?: boolean;
  accent?: "gold" | "emerald" | "ink";
  /** Dunkles Ticker-Panel (Trading-Look) */
  trading?: boolean;
}) {
  const up = (changePct ?? 0) >= 0;
  return (
    <div
      className={cn(
        "rounded-2xl p-4 sm:p-5 shadow-sm",
        trading
          ? "border border-white/10 bg-[#0b1220] text-slate-100"
          : "border border-gray-100 bg-white",
        !trading && accent === "gold" && "ring-1 ring-gold/20",
        !trading && accent === "emerald" && "ring-1 ring-emerald-500/15",
        trading && accent === "gold" && "ring-1 ring-gold/30",
        trading && accent === "emerald" && "ring-1 ring-emerald-400/25"
      )}
    >
      <p
        className={cn(
          "text-[11px] uppercase tracking-wide mb-1",
          trading ? "text-slate-400" : "text-gray-500"
        )}
      >
        {title}
      </p>
      <p
        className={cn(
          "text-xl sm:text-2xl font-semibold tabular-nums",
          trading ? "text-white" : "text-gray-900"
        )}
      >
        {money ? formatEuroDe(value) : value.toLocaleString("de-DE")}
      </p>
      {changePct != null && (
        <p
          className={cn(
            "text-xs mt-2 font-medium",
            up ? "text-emerald-400" : "text-rose-400",
            !trading && (up ? "text-emerald-600" : "text-red-600")
          )}
        >
          {up ? "▲" : "▼"} {Math.abs(changePct).toFixed(1)}% vs. Vorperiode
          {previous != null && (
            <span className={cn("font-normal", trading ? "text-slate-500" : "text-gray-400")}>
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
  trading,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  trading?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl p-4 sm:p-5 shadow-sm",
        trading
          ? "border border-white/10 bg-[#0b1220]"
          : "border border-gray-100 bg-white",
        className
      )}
    >
      <div className="mb-4">
        <h2
          className={cn(
            "font-semibold",
            trading ? "text-slate-100" : "text-gray-900"
          )}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className={cn(
              "text-xs mt-0.5",
              trading ? "text-slate-400" : "text-gray-500"
            )}
          >
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
