"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { formatEuroDe } from "@/lib/pricing";

const GOLD = "#C9A227";
const INK = "#1a1a1a";
const EMERALD = "#059669";
const COLORS = ["#C9A227", "#1a1a1a", "#EA580C", "#059669", "#7C2D12", "#64748b"];

type TipProps = {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string }>;
  label?: string | number;
  moneyKeys?: string[];
};

function FancyTooltip({ active, payload, label, moneyKeys = [] }: TipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white/95 backdrop-blur px-3 py-2 shadow-lg text-xs">
      <p className="font-medium text-gray-800 mb-1">{label}</p>
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

export function RevenueProfitAreaChart({
  data,
  onPointClick,
}: {
  data: { label: string; revenue: number; profit: number; orders?: number }[];
  onPointClick?: (label: string) => void;
}) {
  return (
    <div className="h-64 sm:h-72 w-full">
      {data.length === 0 ? (
        <p className="text-sm text-gray-500 py-16 text-center">Keine Daten</p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            onClick={(state) => {
              const label = (state as { activeLabel?: string })?.activeLabel;
              if (label && onPointClick) onPointClick(String(label));
            }}
          >
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GOLD} stopOpacity={0.4} />
                <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={EMERALD} stopOpacity={0.35} />
                <stop offset="100%" stopColor={EMERALD} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={48} />
            <Tooltip content={<FancyTooltip moneyKeys={["revenue", "profit"]} />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Umsatz"
              stroke={GOLD}
              fill="url(#revFill)"
              strokeWidth={2}
              activeDot={{ r: 6, cursor: "pointer" }}
            />
            <Area
              type="monotone"
              dataKey="profit"
              name="Gewinn"
              stroke={EMERALD}
              fill="url(#profitFill)"
              strokeWidth={2}
              activeDot={{ r: 6, cursor: "pointer" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function ComparisonBarChart({
  data,
  dataKey = "value",
  name = "Wert",
  money,
  onBarClick,
}: {
  data: { label: string; value: number; [k: string]: string | number }[];
  dataKey?: string;
  name?: string;
  money?: boolean;
  onBarClick?: (label: string) => void;
}) {
  return (
    <div className="h-56 sm:h-64 w-full">
      {data.length === 0 ? (
        <p className="text-sm text-gray-500 py-12 text-center">Keine Daten</p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={40} />
            <Tooltip
              content={
                <FancyTooltip moneyKeys={money ? [dataKey] : []} />
              }
            />
            <Bar
              dataKey={dataKey}
              name={name}
              fill={INK}
              radius={[6, 6, 0, 0]}
              cursor="pointer"
              onClick={(d) => {
                const label = (d as { label?: string })?.label;
                if (label && onBarClick) onBarClick(String(label));
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function DonutChart({
  data,
  onSliceClick,
}: {
  data: { name: string; value: number; id?: string }[];
  onSliceClick?: (id: string, name: string) => void;
}) {
  return (
    <div className="h-56 sm:h-64 w-full">
      {data.length === 0 ? (
        <p className="text-sm text-gray-500 py-12 text-center">Keine Daten</p>
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
              formatter={(v) => formatEuroDe(Number(v ?? 0))}
              contentStyle={{ borderRadius: 12 }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function HorizontalRankChart({
  data,
  onBarClick,
}: {
  data: { name: string; units: number; profit: number; id: string }[];
  onBarClick?: (id: string, name: string) => void;
}) {
  return (
    <div className="h-64 w-full">
      {data.length === 0 ? (
        <p className="text-sm text-gray-500 py-12 text-center">Keine Daten</p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.slice(0, 8)} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis
              type="category"
              dataKey="name"
              width={90}
              tick={{ fontSize: 10 }}
            />
            <Tooltip content={<FancyTooltip moneyKeys={["profit"]} />} />
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
