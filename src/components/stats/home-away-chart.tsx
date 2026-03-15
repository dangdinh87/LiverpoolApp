"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { WDLRecord } from "@/lib/football/season-stats";

interface Props {
  home: WDLRecord;
  away: WDLRecord;
  labels: { home: string; away: string; wins: string; draws: string; losses: string; gf: string; ga: string };
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; fill: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-stadium-surface border border-stadium-border px-3 py-2 rounded">
      <p className="font-inter text-xs text-white font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="font-inter text-xs" style={{ color: p.fill }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

export function HomeAwayChart({ home, away, labels }: Props) {
  const data = [
    { name: labels.wins, [labels.home]: home.w, [labels.away]: away.w },
    { name: labels.draws, [labels.home]: home.d, [labels.away]: away.d },
    { name: labels.losses, [labels.home]: home.l, [labels.away]: away.l },
    { name: labels.gf, [labels.home]: home.gf, [labels.away]: away.gf },
    { name: labels.ga, [labels.home]: home.ga, [labels.away]: away.ga },
  ];

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Legend
          wrapperStyle={{ fontSize: 11, color: "#A0A0A0" }}
          iconType="square"
          iconSize={10}
        />
        <Bar dataKey={labels.home} fill="#C8102E" radius={[3, 3, 0, 0]} />
        <Bar dataKey={labels.away} fill="#F6EB61" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
