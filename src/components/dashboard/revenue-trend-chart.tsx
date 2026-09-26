"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatCompactPaise, formatPaise } from "@/lib/money";
import type { DailyPoint } from "@/lib/analytics/daily-series";

function formatDateShort(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number }[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const revenue = payload.find((p) => p.dataKey === "revenuePaise")?.value ?? 0;
  const profit = payload.find((p) => p.dataKey === "profitPaise")?.value ?? 0;

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-md text-xs space-y-1">
      <p className="font-medium text-ink">{label ? formatDateShort(label) : ""}</p>
      <p className="flex items-center gap-1.5 text-ink-muted">
        <span className="h-2 w-2 rounded-full" style={{ background: "var(--chart-revenue)" }} />
        Revenue <span className="font-medium text-ink">{formatPaise(revenue)}</span>
      </p>
      <p className="flex items-center gap-1.5 text-ink-muted">
        <span className="h-2 w-2 rounded-full" style={{ background: "var(--chart-profit)" }} />
        Profit <span className="font-medium text-ink">{formatPaise(profit)}</span>
      </p>
    </div>
  );
}

export function RevenueTrendChart({ data }: { data: DailyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDateShort}
          tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          tickFormatter={(v) => formatCompactPaise(v)}
          tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip content={<ChartTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "var(--ink-muted)" }}
          formatter={(value) => (value === "revenuePaise" ? "Revenue" : "Gross profit")}
        />
        <Line
          type="monotone"
          dataKey="revenuePaise"
          stroke="var(--chart-revenue)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="profitPaise"
          stroke="var(--chart-profit)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
