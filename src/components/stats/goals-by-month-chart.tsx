"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { useNowAfterMount } from "@/hooks/use-now-after-mount";
import type { MonthlyGoals } from "@/lib/football/season-stats";

interface Props {
  data: MonthlyGoals[];
  labels: { scored: string; conceded: string; partial: string; matches: string };
  monthLabels: string[]; // 12 localized month abbreviations [Jan, Feb, ...]
}

const SCORED = "#C8102E";
const CONCEDED = "#9A9A9A";

interface Row {
  name: string;
  partial: boolean;
  scored: number;
  conceded: number;
  matches: number;
}

interface TickProps {
  x?: number | string;
  y?: number | string;
  payload?: { value: string; index: number };
}

/** Two-line tick: the month, then "so far" under the one still being played. */
function renderMonthTick({ x: rawX = 0, y: rawY = 0, payload }: TickProps, rows: Row[], partialLabel: string) {
  const x = Number(rawX);
  const y = Number(rawY);
  return (
    <text x={x} y={y + 14} textAnchor="middle" fill="#A0A0A0" fontSize={12}>
      <tspan x={x}>{payload?.value}</tspan>
      {rows[payload?.index ?? 0]?.partial && (
        <tspan x={x} dy={14} fill="#F6EB61" fontSize={11}>
          {partialLabel}
        </tspan>
      )}
    </text>
  );
}

function CustomTooltip({ active, payload, label, matchesLabel }: { active?: boolean; payload?: { value: number; name: string; dataKey?: string; payload: Row }[]; label?: string; matchesLabel: string }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="border border-stadium-border bg-stadium-surface px-3 py-2">
      <p className="mb-1 font-inter text-xs font-semibold text-white">
        {label} · {row.matches} {matchesLabel}
      </p>
      {payload.map((p) => (
        <p key={p.name} className="font-inter text-xs" style={{ color: p.dataKey === "scored" ? "#ff3347" : CONCEDED }}>
          {p.value} {p.name}
        </p>
      ))}
    </div>
  );
}

/**
 * Goals scored and conceded per month, as bars. The line chart that stood here
 * drew a smoothed curve through three or four points, and the month still being
 * played looked like a collapse to zero; bars say "this many goals in this many
 * games", and the current month is labelled as unfinished.
 */
export function GoalsByMonthChart({ data, labels, monthLabels }: Props) {
  const now = useNowAfterMount(3_600_000);
  if (data.length === 0) return null;

  const currentKey = now === null ? null : new Date(now).toISOString().slice(0, 7);
  const rows: Row[] = data.map((d) => ({
    name: monthLabels[d.monthIndex] ?? d.month,
    partial: d.month === currentKey,
    scored: d.scored,
    conceded: d.conceded,
    matches: d.matches,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barGap={3} barCategoryGap="22%">
        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
        <XAxis dataKey="name" tick={(p: TickProps) => renderMonthTick(p, rows, labels.partial)} axisLine={false} tickLine={false} interval={0} height={36} />
        <YAxis tick={{ fill: "#A0A0A0", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<CustomTooltip matchesLabel={labels.matches} />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Legend
          formatter={(value) => <span style={{ color: "#A0A0A0" }}>{value}</span>}
          wrapperStyle={{ fontSize: 12 }}
          iconType="square"
          iconSize={10}
        />
        <Bar dataKey="scored" name={labels.scored} fill={SCORED} radius={[3, 3, 0, 0]} maxBarSize={28} />
        <Bar dataKey="conceded" name={labels.conceded} fill={CONCEDED} radius={[3, 3, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
