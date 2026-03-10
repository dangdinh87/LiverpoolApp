"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { TopScorer } from "@/lib/types/football";

interface BarChartEntry {
  name: string;
  value: number;
  isLiverpool: boolean;
}

interface StatChartProps {
  scorers: TopScorer[];
  type: "goals" | "assists";
  limit?: number;
}

function buildChartData(
  scorers: TopScorer[],
  type: "goals" | "assists",
  limit: number
): BarChartEntry[] {
  return scorers
    .slice(0, limit)
    .map((s) => {
      const stat = s.statistics[0];
      const value =
        type === "goals"
          ? (stat?.goals?.total ?? 0)
          : (stat?.goals?.assists ?? 0);
      return {
        name: s.player.lastname || s.player.name.split(" ").pop() || s.player.name,
        value,
        isLiverpool: s.statistics[0]?.team?.id === 40,
      };
    })
    .filter((d) => d.value > 0);
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) => {
  if (active && payload?.length) {
    return (
      <div className="bg-stadium-surface border border-stadium-border rounded-none px-3 py-2">
        <p className="font-inter text-xs text-white font-semibold">{label}</p>
        <p className="font-bebas text-xl text-lfc-red">{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export function StatChart({ scorers, type, limit = 10 }: StatChartProps) {
  const data = buildChartData(scorers, type, limit);

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="name"
          tick={{ fill: "#6b7280", fontSize: 11, fontFamily: "var(--font-inter)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#6b7280", fontSize: 11, fontFamily: "var(--font-inter)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.isLiverpool ? "#C8102E" : "#374151"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
