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

/** --color-lfc-red-text: the brand red that passes AA on the dark card (#C8102E is 3:1). */
const RED_TEXT = "#ff3347";

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
      <p className={`font-bebas text-2xl ${entry.isLiverpool ? "text-lfc-red-text" : "text-stadium-muted"}`}>
        {payload[0].value}
      </p>
    </div>
  );
}

// Value printed at the end of each bar
function ValueLabel(props: { x?: number; y?: number; width?: number; height?: number; value?: number; index?: number; data?: BarChartEntry[] }) {
  const { x = 0, y = 0, width = 0, height = 0, value, index = 0, data = [] } = props;
  const entry = data[index];
  if (!entry) return null;
  return (
    <text
      x={x + width + 6}
      y={y + height / 2 + 5}
      textAnchor="start"
      fill={entry.isLiverpool ? RED_TEXT : "#A0A0A0"}
      fontSize={14}
      fontFamily="var(--font-bebas)"
      fontWeight={700}
    >
      {value}
    </text>
  );
}

const ROW_PX = 30;

/**
 * Horizontal bars: a Liverpool player's surname is always readable (on a
 * 360px-wide column chart the labels collided and Recharts silently dropped
 * them), other clubs' players show only their rank. Counts are whole numbers.
 */
export function StatChart({ scorers, type, limit = 10 }: StatChartProps) {
  const data = buildChartData(scorers, type, limit);
  const height = Math.max(120, data.length * ROW_PX + 16);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 28, left: 0, bottom: 4 }} barCategoryGap={6}>
        <XAxis type="number" hide allowDecimals={false} domain={[0, "dataMax"]} />
        <YAxis
          type="category"
          dataKey="name"
          width={84}
          interval={0}
          axisLine={false}
          tickLine={false}
          tick={(props: Record<string, unknown>) => {
            const x = Number(props.x ?? 0);
            const y = Number(props.y ?? 0);
            const payload = props.payload as { value: string; index: number } | undefined;
            const entry = data[payload?.index ?? 0];
            return (
              <text
                x={x - 4}
                y={y + 4}
                textAnchor="end"
                fill={entry?.isLiverpool ? RED_TEXT : "#A0A0A0"}
                fontSize={13}
                fontFamily="var(--font-inter)"
                fontWeight={entry?.isLiverpool ? 600 : 400}
              >
                {payload?.value}
              </text>
            );
          }}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(200,16,46,0.06)" }} />
        <Bar dataKey="value" radius={[0, 3, 3, 0]} barSize={18}>
          <LabelList dataKey="value" content={<ValueLabel data={data} />} />
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
