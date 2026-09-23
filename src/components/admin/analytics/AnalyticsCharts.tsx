"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatEuroDe } from "@/lib/pricing";

const GOLD = "#C9A227";
const INK = "#1a1a1a";
const EMERALD = "#34d399";
const SLATE = "#94a3b8";
const COLORS = ["#C9A227", "#34d399", "#fb7185", "#38bdf8", "#a78bfa", "#f97316"];

type TipProps = {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string }>;
  label?: string | number;
  moneyKeys?: string[];
  dark?: boolean;
};

function FancyTooltip({
  active,
  payload,
  label,
  moneyKeys = [],
  dark,
}: TipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className={
        dark
          ? "rounded-lg border border-white/10 bg-[#0b1220]/95 backdrop-blur px-3 py-2 shadow-xl text-xs text-slate-100"
          : "rounded-xl border border-gray-200 bg-white/95 backdrop-blur px-3 py-2 shadow-lg text-xs"
      }
    >
      <p className={`font-medium mb-1 ${dark ? "text-slate-200" : "text-gray-800"}`}>
        {label}
      </p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} style={{ color: p.color }} className="tabular-nums">
          {p.name}:{" "}
          {moneyKeys.includes(String(p.dataKey))
            ? formatEuroDe(Number(p.value ?? 0))
            : Number(p.value ?? 0).toLocaleString("de-DE")}
        </p>
      ))}
    </div>
  );
}

/** Trading-Style: Umsatz/Gewinn + Volumen, Crosshair-Tooltip, Brush-Zoom */
export function TradingRevenueChart({
  data,
  onPointClick,
}: {
  data: { label: string; revenue: number; profit: number; orders?: number }[];
  onPointClick?: (label: string) => void;
}) {
  return (
    <div className="h-72 sm:h-80 w-full rounded-xl bg-[#070b14] ring-1 ring-white/5 px-1 pt-2">
      {data.length === 0 ? (
        <p className="text-sm text-slate-500 py-20 text-center">Keine Marktdaten</p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            onClick={(state) => {
              const label = (state as { activeLabel?: string })?.activeLabel;
              if (label && onPointClick) onPointClick(String(label));
            }}
          >
            <defs>
              <linearGradient id="tradeRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GOLD} stopOpacity={0.45} />
                <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="tradeProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={EMERALD} stopOpacity={0.35} />
                <stop offset="100%" stopColor={EMERALD} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: SLATE }}
              axisLine={{ stroke: "#1e293b" }}
              tickLine={false}
            />
            <YAxis
              yAxisId="money"
              tick={{ fontSize: 10, fill: SLATE }}
              width={52}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) =>
                Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(1)}k` : String(v)
              }
            />
            <YAxis
              yAxisId="vol"
              orientation="right"
              tick={{ fontSize: 10, fill: SLATE }}
              width={28}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ stroke: GOLD, strokeWidth: 1, strokeDasharray: "4 4" }}
              content={
                <FancyTooltip
                  dark
                  moneyKeys={["revenue", "profit"]}
                />
              }
            />
            <Legend
              wrapperStyle={{ fontSize: 11, color: SLATE, paddingTop: 4 }}
            />
            <Bar
              yAxisId="vol"
              dataKey="orders"
              name="Orders"
              fill="#334155"
              radius={[2, 2, 0, 0]}
              barSize={14}
              opacity={0.85}
            />
            <Area
              yAxisId="money"
              type="monotone"
              dataKey="revenue"
              name="Umsatz"
              stroke={GOLD}
              fill="url(#tradeRev)"
              strokeWidth={2}
              activeDot={{ r: 5, fill: GOLD, stroke: "#070b14", strokeWidth: 2 }}
            />
            <Line
              yAxisId="money"
              type="monotone"
              dataKey="profit"
              name="Gewinn"
              stroke={EMERALD}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: EMERALD }}
            />
            <Brush
              dataKey="label"
              height={22}
              stroke="#334155"
              fill="#0f172a"
              travellerWidth={8}
              tickFormatter={() => ""}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function RevenueProfitAreaChart({
  data,
  onPointClick,
}: {
  data: { label: string; revenue: number; profit: number; orders?: number }[];
  onPointClick?: (label: string) => void;
}) {
  return <TradingRevenueChart data={data} onPointClick={onPointClick} />;
}

export function ComparisonBarChart({
  data,
  dataKey = "value",
  name = "Wert",
  money,
  onBarClick,
  dark,
}: {
  data: { label: string; value: number; [k: string]: string | number }[];
  dataKey?: string;
  name?: string;
  money?: boolean;
  onBarClick?: (label: string) => void;
  dark?: boolean;
}) {
  const fill = dark ? GOLD : INK;
  return (
    <div
      className={
        dark
          ? "h-56 sm:h-64 w-full rounded-xl bg-[#070b14] ring-1 ring-white/5 px-1 pt-2"
          : "h-56 sm:h-64 w-full"
      }
    >
      {data.length === 0 ? (
        <p className={`text-sm py-12 text-center ${dark ? "text-slate-500" : "text-gray-500"}`}>
          Keine Daten
        </p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={dark ? "#1e293b" : "#f0f0f0"}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: dark ? SLATE : undefined }}
              axisLine={dark ? { stroke: "#1e293b" } : undefined}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: dark ? SLATE : undefined }}
              width={40}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: dark ? "rgba(201,162,39,0.08)" : "rgba(0,0,0,0.04)" }}
              content={
                <FancyTooltip dark={dark} moneyKeys={money ? [dataKey] : []} />
              }
            />
            <Bar
              dataKey={dataKey}
              name={name}
              fill={fill}
              radius={[6, 6, 0, 0]}
              cursor="pointer"
              onClick={(d) => {
                const label = (d as { label?: string })?.label;
                if (label && onBarClick) onBarClick(String(label));
              }}
            >
              {dark &&
                data.map((_, i) => (
                  <Cell
                    key={i}
                    fill={i % 2 === 0 ? GOLD : "#a16207"}
                    fillOpacity={0.9}
                  />
                ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function DonutChart({
  data,
  onSliceClick,
  money = true,
  dark,
}: {
  data: { name: string; value: number; id?: string }[];
  onSliceClick?: (id: string, name: string) => void;
  money?: boolean;
  dark?: boolean;
}) {
  return (
    <div
      className={
        dark
          ? "h-56 sm:h-64 w-full rounded-xl bg-[#070b14] ring-1 ring-white/5"
          : "h-56 sm:h-64 w-full"
      }
    >
      {data.length === 0 ? (
        <p className={`text-sm py-12 text-center ${dark ? "text-slate-500" : "text-gray-500"}`}>
          Keine Daten
        </p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="55%"
              outerRadius="80%"
              paddingAngle={2}
              cursor="pointer"
              onClick={(_, index) => {
                const row = data[index];
                if (row && onSliceClick) onSliceClick(row.id || row.name, row.name);
              }}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) =>
                money
                  ? formatEuroDe(Number(v ?? 0))
                  : Number(v ?? 0).toLocaleString("de-DE")
              }
              contentStyle={
                dark
                  ? {
                      borderRadius: 8,
                      background: "#0b1220",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#e2e8f0",
                    }
                  : { borderRadius: 12 }
              }
            />
            <Legend
              wrapperStyle={{
                fontSize: 11,
                color: dark ? SLATE : undefined,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function HorizontalRankChart({
  data,
  onBarClick,
  dark,
}: {
  data: { name: string; units: number; profit: number; id: string }[];
  onBarClick?: (id: string, name: string) => void;
  dark?: boolean;
}) {
  return (
    <div
      className={
        dark
          ? "h-64 w-full rounded-xl bg-[#070b14] ring-1 ring-white/5 px-1 pt-2"
          : "h-64 w-full"
      }
    >
      {data.length === 0 ? (
        <p className={`text-sm py-12 text-center ${dark ? "text-slate-500" : "text-gray-500"}`}>
          Keine Daten
        </p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.slice(0, 8)} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={dark ? "#1e293b" : "#f0f0f0"}
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: dark ? SLATE : undefined }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={90}
              tick={{ fontSize: 10, fill: dark ? SLATE : undefined }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<FancyTooltip dark={dark} moneyKeys={["profit"]} />}
            />
            <Bar
              dataKey="units"
              name="Stück"
              fill={GOLD}
              radius={[0, 6, 6, 0]}
              cursor="pointer"
              onClick={(d) => {
                const row = d as { id?: string; name?: string };
                if (row?.id && onBarClick) onBarClick(row.id, row.name || "");
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/** Besucher-Zeitreihe (Trading-Sparklines-ähnlich) */
export function TrafficAreaChart({
  data,
}: {
  data: { label: string; views: number }[];
}) {
  return (
    <div className="h-64 sm:h-72 w-full rounded-xl bg-[#070b14] ring-1 ring-white/5 px-1 pt-2">
      {data.length === 0 ? (
        <p className="text-sm text-slate-500 py-20 text-center">
          Noch keine Aufrufe erfasst
        </p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="trafficFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: SLATE }}
              axisLine={{ stroke: "#1e293b" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: SLATE }}
              width={36}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ stroke: "#38bdf8", strokeDasharray: "4 4" }}
              content={<FancyTooltip dark />}
            />
            <Area
              type="monotone"
              dataKey="views"
              name="Aufrufe"
              stroke="#38bdf8"
              fill="url(#trafficFill)"
              strokeWidth={2}
              activeDot={{ r: 5 }}
            />
            <Brush
              dataKey="label"
              height={20}
              stroke="#334155"
              fill="#0f172a"
              travellerWidth={8}
              tickFormatter={() => ""}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
