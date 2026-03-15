"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import type { TopScorer } from "@/lib/types/football";

interface BarChartEntry {
  name: string;
  fullName: string;
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
    .map((s, i) => {
      const stat = s.statistics[0];
      const value =
        type === "goals"
          ? (stat?.goals?.total ?? 0)
          : (stat?.goals?.assists ?? 0);
      const isLiverpool = s.statistics[0]?.team?.id === 40;
      const lastName = s.player.lastname || s.player.name.split(" ").pop() || s.player.name;
      return {
        // Only show Liverpool player names, others show rank number
        name: isLiverpool ? lastName : `#${i + 1}`,
        fullName: lastName,
        value,
        isLiverpool,
      };
    })
    .filter((d) => d.value > 0);
}

// Custom tooltip with Dark Stadium styling
function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: BarChartEntry; value: number }[];
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  return (
    <div className="bg-stadium-bg border border-stadium-border px-3 py-2 shadow-lg">
      <p className="font-inter text-xs text-white font-semibold">{entry.fullName}</p>
      <p className={`font-bebas text-2xl ${entry.isLiverpool ? "text-lfc-red" : "text-stadium-muted"}`}>
        {payload[0].value}
      </p>
    </div>
  );
}

// Custom label showing value on top of bar
function ValueLabel(props: { x?: number; y?: number; width?: number; value?: number; index?: number; data?: BarChartEntry[] }) {
  const { x = 0, y = 0, width = 0, value, index = 0, data = [] } = props;
  const entry = data[index];
  if (!entry) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 6}
      textAnchor="middle"
      fill={entry.isLiverpool ? "#C8102E" : "#6B7280"}
      fontSize={12}
      fontFamily="var(--font-bebas)"
      fontWeight={700}
    >
      {value}
    </text>
  );
}

export function StatChart({ scorers, type, limit = 10 }: StatChartProps) {
  const data = buildChartData(scorers, type, limit);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 24, right: 8, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="name"
          tick={(props: Record<string, unknown>) => {
            const x = Number(props.x ?? 0);
            const y = Number(props.y ?? 0);
            const payload = props.payload as { value: string; index: number } | undefined;
            const entry = data[payload?.index ?? 0];
            return (
              <text
                x={x}
                y={y + 14}
                textAnchor="middle"
                fill={entry?.isLiverpool ? "#C8102E" : "#4B5563"}
                fontSize={entry?.isLiverpool ? 11 : 10}
                fontFamily="var(--font-inter)"
                fontWeight={entry?.isLiverpool ? 600 : 400}
              >
                {payload?.value}
              </text>
            );
          }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#4B5563", fontSize: 10, fontFamily: "var(--font-inter)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(200,16,46,0.06)" }} />
        <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={36}>
          <LabelList
            dataKey="value"
            content={<ValueLabel data={data} />}
          />
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.isLiverpool ? "#C8102E" : "#2A2A2A"}
              stroke={entry.isLiverpool ? "#C8102E" : "#374151"}
              strokeWidth={entry.isLiverpool ? 0 : 1}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
