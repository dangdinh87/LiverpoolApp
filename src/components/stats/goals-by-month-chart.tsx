"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { MonthlyGoals } from "@/lib/football/season-stats";

interface Props {
  data: MonthlyGoals[];
  labels: { scored: string; conceded: string };
  monthLabels: string[]; // 12 localized month abbreviations [Jan, Feb, ...]
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; dataKey?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-stadium-surface border border-stadium-border px-3 py-2 rounded">
      <p className="font-inter text-xs text-white font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="font-inter text-xs" style={{ color: p.dataKey === "scored" ? "#C8102E" : "#6B7280" }}>
          {p.dataKey === "scored" ? "⚽" : "🛡️"} {p.value} {p.name}
        </p>
      ))}
    </div>
  );
}

export function GoalsByMonthChart({ data, labels, monthLabels }: Props) {
  if (data.length === 0) return null;

  const chartData = data.map((d) => ({
    name: monthLabels[d.monthIndex] ?? d.month,
    scored: d.scored,
    conceded: d.conceded,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="scoredGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#C8102E" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#C8102E" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="concededGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6B7280" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#6B7280" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
        <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="scored"
          name={labels.scored}
          stroke="#C8102E"
          strokeWidth={2.5}
          fill="url(#scoredGrad)"
          dot={{ fill: "#C8102E", strokeWidth: 0, r: 3 }}
        />
        <Area
          type="monotone"
          dataKey="conceded"
          name={labels.conceded}
          stroke="#6B7280"
          strokeWidth={2}
          strokeDasharray="4 4"
          fill="url(#concededGrad)"
          dot={{ fill: "#6B7280", strokeWidth: 0, r: 3 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
