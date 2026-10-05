import { cn } from "@/lib/utils";
import type { SeasonOverview as SeasonOverviewType } from "@/lib/football/season-stats";
import { Flame, Shield } from "lucide-react";

// ─── StatCard ───────────────────────────────────────────────────────────────────

function StatCard({ value, label, color, accent }: { value: string | number; label: string; color?: string; accent?: boolean }) {
  return (
    <div className={cn(
      "p-3 sm:p-4 text-center relative overflow-hidden",
      accent ? "bg-lfc-red/10 border border-lfc-red/20" : "bg-stadium-surface2"
    )}>
      {accent && <div className="absolute top-0 left-0 right-0 h-0.5 bg-lfc-red" />}
      <div className={cn("font-bebas text-2xl sm:text-4xl leading-none", color ?? "text-white")}>{value}</div>
      <div className="font-barlow text-xs sm:text-xs text-stadium-muted uppercase tracking-[0.15em] mt-1.5">{label}</div>
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────────

interface Props {
  stats: SeasonOverviewType;
  streak: { type: "W" | "unbeaten"; count: number };
  labels: Record<string, string>;
}


export function SeasonOverview({ stats, streak, labels }: Props) {
  // Eleven tiles previously carried five different hues — green, amber, red-400,
  // lfc-red and lfc-gold — which reads as a generic analytics dashboard, and the
  // same red meant "defeats" in one tile and "goals we scored" in the next.
  //
  // The palette is now the club's: red is reserved for the two headline figures
  // (which already earn emphasis from the accent treatment), gold marks a good
  // outcome, and everything else is plain ink. Emphasis comes from position and
  // treatment, not from painting every number a different colour.
  const GOOD = "text-lfc-gold";
  const QUIET = "text-stadium-muted";

  // Row 1: Core record (4 cols)
  const row1 = [
    { value: stats.played, label: labels.played },
    { value: stats.wins, label: labels.wins, color: GOOD },
    { value: stats.draws, label: labels.draws, color: QUIET },
    { value: stats.losses, label: labels.losses, color: QUIET },
  ];

  // Row 2: Goals + Performance (4 cols)
  const row2 = [
    { value: stats.goalsFor, label: labels.goalsFor, color: "text-brand", accent: true },
    { value: stats.goalsAgainst, label: labels.goalsAgainst },
    { value: stats.goalDiff > 0 ? `+${stats.goalDiff}` : String(stats.goalDiff), label: labels.goalDiff, color: stats.goalDiff > 0 ? GOOD : QUIET },
    { value: stats.cleanSheets, label: labels.cleanSheets },
  ];

  // Row 3: PL-specific (3 cols)
  const row3 = [
    { value: stats.points || "—", label: labels.points, color: "text-brand", accent: true },
    { value: stats.rank ? `#${stats.rank}` : "—", label: labels.rank },
    { value: `${stats.winRate}%`, label: labels.winRate },
  ];

  return (
    <div className="surface overflow-hidden">
      {/* Red top accent */}
      <div className="h-1 bg-linear-to-r from-lfc-red via-lfc-red/60 to-transparent" />

      <div className="p-4 sm:p-6 space-y-3">
        {/* Row 1: W/D/L */}
        <div
          className="grid grid-cols-4 gap-2 sm:gap-3"
        >
          {row1.map((c) => <div key={c.label}><StatCard {...c} /></div>)}
        </div>

        {/* Row 2: Goals */}
        <div
          className="grid grid-cols-4 gap-2 sm:gap-3"
        >
          {row2.map((c) => <div key={c.label}><StatCard {...c} /></div>)}
        </div>

        {/* Row 3: PL stats */}
        <div
          className="grid grid-cols-3 gap-2 sm:gap-3"
        >
          {row3.map((c) => <div key={c.label}><StatCard {...c} /></div>)}
        </div>
      </div>

      {/* Streak badge */}
      {streak.count > 0 && (
        <div className="border-t border-stadium-border px-4 py-3 flex justify-center">
          <span className={cn(
            "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide",
            streak.type === "W" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
          )}>
            {streak.type === "W" ? <Flame size={13} aria-hidden /> : <Shield size={13} aria-hidden />}
            {streak.type === "W" ? labels.winStreak : labels.unbeaten}
          </span>
        </div>
      )}
    </div>
  );
}
