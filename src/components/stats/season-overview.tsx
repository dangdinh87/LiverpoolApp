"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { SeasonOverview as SeasonOverviewType } from "@/lib/football/season-stats";

// ─── StatCard ───────────────────────────────────────────────────────────────────

function StatCard({ value, label, color, accent }: { value: string | number; label: string; color?: string; accent?: boolean }) {
  return (
    <div className={cn(
      "rounded p-3 sm:p-4 text-center relative overflow-hidden",
      accent ? "bg-lfc-red/10 border border-lfc-red/20" : "bg-stadium-surface2"
    )}>
      {accent && <div className="absolute top-0 left-0 right-0 h-0.5 bg-lfc-red" />}
      <div className={cn("font-bebas text-2xl sm:text-4xl leading-none", color ?? "text-white")}>{value}</div>
      <div className="font-barlow text-[9px] sm:text-[10px] text-stadium-muted uppercase tracking-[0.15em] mt-1.5">{label}</div>
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────────

interface Props {
  stats: SeasonOverviewType;
  streak: { type: "W" | "unbeaten"; count: number };
  labels: Record<string, string>;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.035 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

function getOrdinal(n: number): string {
  if (n >= 11 && n <= 13) return "th";
  switch (n % 10) { case 1: return "st"; case 2: return "nd"; case 3: return "rd"; default: return "th"; }
}

export function SeasonOverview({ stats, streak, labels }: Props) {
  // Row 1: Core record (4 cols)
  const row1 = [
    { value: stats.played, label: labels.played },
    { value: stats.wins, label: labels.wins, color: "text-green-400" },
    { value: stats.draws, label: labels.draws, color: "text-amber-400" },
    { value: stats.losses, label: labels.losses, color: "text-red-400" },
  ];

  // Row 2: Goals + Performance (4 cols)
  const row2 = [
    { value: stats.goalsFor, label: labels.goalsFor, color: "text-lfc-red", accent: true },
    { value: stats.goalsAgainst, label: labels.goalsAgainst },
    { value: stats.goalDiff > 0 ? `+${stats.goalDiff}` : String(stats.goalDiff), label: labels.goalDiff, color: stats.goalDiff > 0 ? "text-green-400" : "text-red-400" },
    { value: stats.cleanSheets, label: labels.cleanSheets, color: "text-lfc-gold" },
  ];

  // Row 3: PL-specific (3 cols)
  const row3 = [
    { value: stats.points || "—", label: labels.points, color: "text-lfc-red", accent: true },
    { value: stats.rank ? `${stats.rank}${getOrdinal(stats.rank)}` : "—", label: labels.rank, color: "text-lfc-gold" },
    { value: `${stats.winRate}%`, label: labels.winRate },
  ];

  return (
    <div className="bg-stadium-surface border border-stadium-border overflow-hidden">
      {/* Red top accent */}
      <div className="h-1 bg-linear-to-r from-lfc-red via-lfc-red/60 to-transparent" />

      <div className="p-4 sm:p-6 space-y-3">
        {/* Row 1: W/D/L */}
        <motion.div
          className="grid grid-cols-4 gap-2 sm:gap-3"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
        >
          {row1.map((c) => <motion.div key={c.label} variants={item}><StatCard {...c} /></motion.div>)}
        </motion.div>

        {/* Row 2: Goals */}
        <motion.div
          className="grid grid-cols-4 gap-2 sm:gap-3"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
        >
          {row2.map((c) => <motion.div key={c.label} variants={item}><StatCard {...c} /></motion.div>)}
        </motion.div>

        {/* Row 3: PL stats */}
        <motion.div
          className="grid grid-cols-3 gap-2 sm:gap-3"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
        >
          {row3.map((c) => <motion.div key={c.label} variants={item}><StatCard {...c} /></motion.div>)}
        </motion.div>
      </div>

      {/* Streak badge */}
      {streak.count > 0 && (
        <div className="border-t border-stadium-border px-4 py-3 flex justify-center">
          <span className={cn(
            "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide",
            streak.type === "W" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
          )}>
            {streak.type === "W" ? "🔥" : "💪"} {streak.type === "W" ? labels.winStreak : labels.unbeaten}
          </span>
        </div>
      )}
    </div>
  );
}
