"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import type { SeasonOverview } from "@/lib/football";

interface SeasonComparisonProps {
  seasons: { label: string; overview: SeasonOverview }[];
  labels: {
    wins: string;
    draws: string;
    losses: string;
    goalsFor: string;
    goalsAgainst: string;
    played: string;
    winRate: string;
  };
}

export function SeasonComparison({ seasons, labels }: SeasonComparisonProps) {
  if (seasons.length < 2) return null;

  // W/D/L comparison data
  const wdlData = seasons.map((s) => ({
    name: s.label,
    [labels.wins]: s.overview.wins,
    [labels.draws]: s.overview.draws,
    [labels.losses]: s.overview.losses,
  }));

  // Goals comparison data
  const goalsData = seasons.map((s) => ({
    name: s.label,
    [labels.goalsFor]: s.overview.goalsFor,
    [labels.goalsAgainst]: s.overview.goalsAgainst,
  }));

  return (
    <div className="space-y-6">
      {/* Season stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {seasons.map((s) => (
          <div
            key={s.label}
            className="bg-stadium-surface border border-stadium-border p-4 text-center"
          >
            <p className="font-barlow text-[10px] text-stadium-muted uppercase tracking-wider mb-2">
              {s.label}
            </p>
            <p className="font-bebas text-3xl text-white leading-none mb-1">
              {s.overview.played}
            </p>
            <p className="font-barlow text-[9px] text-stadium-muted uppercase">
              {labels.played}
            </p>
            <div className="flex justify-center gap-3 mt-2">
              <span className="font-bebas text-sm text-green-400">{s.overview.wins}W</span>
              <span className="font-bebas text-sm text-amber-400">{s.overview.draws}D</span>
              <span className="font-bebas text-sm text-red-400">{s.overview.losses}L</span>
            </div>
            <p className="font-bebas text-lg text-lfc-red mt-1">
              {s.overview.winRate.toFixed(0)}%
            </p>
            <p className="font-barlow text-[9px] text-stadium-muted uppercase">
              {labels.winRate}
            </p>
          </div>
        ))}
      </div>

      {/* W/D/L bar chart */}
      <div className="bg-stadium-surface border border-stadium-border p-4 sm:p-6">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={wdlData} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
            <XAxis dataKey="name" stroke="#A0A0A0" fontSize={12} fontFamily="Barlow Condensed" />
            <YAxis stroke="#A0A0A0" fontSize={11} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 0 }}
              labelStyle={{ color: "#fff", fontFamily: "Barlow Condensed" }}
            />
            <Legend wrapperStyle={{ fontSize: 11, fontFamily: "Barlow Condensed" }} />
            <Bar dataKey={labels.wins} fill="#22c55e" radius={[2, 2, 0, 0]} />
            <Bar dataKey={labels.draws} fill="#f59e0b" radius={[2, 2, 0, 0]} />
            <Bar dataKey={labels.losses} fill="#ef4444" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Goals comparison bar chart */}
      <div className="bg-stadium-surface border border-stadium-border p-4 sm:p-6">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={goalsData} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
            <XAxis dataKey="name" stroke="#A0A0A0" fontSize={12} fontFamily="Barlow Condensed" />
            <YAxis stroke="#A0A0A0" fontSize={11} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 0 }}
              labelStyle={{ color: "#fff", fontFamily: "Barlow Condensed" }}
            />
            <Legend wrapperStyle={{ fontSize: 11, fontFamily: "Barlow Condensed" }} />
            <Bar dataKey={labels.goalsFor} fill="#C8102E" radius={[2, 2, 0, 0]} />
            <Bar dataKey={labels.goalsAgainst} fill="#A0A0A0" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
