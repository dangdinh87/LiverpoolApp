import { cn } from "@/lib/utils";
import type { FplPlayerDetail } from "@/lib/fpl-data";

interface Props {
  player: FplPlayerDetail;
}

const STAT_GROUPS = [
  {
    label: "Attack",
    stats: (p: FplPlayerDetail) => [
      { label: "Goals", value: p.goals },
      { label: "Assists", value: p.assists },
      { label: "xG", value: p.xG.toFixed(1) },
      { label: "xA", value: p.xA.toFixed(1) },
      { label: "Pens Missed", value: p.penaltiesMissed },
    ],
  },
  {
    label: "Defence",
    stats: (p: FplPlayerDetail) => [
      { label: "Clean Sheets", value: p.cleanSheets },
      { label: "Goals Conceded", value: p.goalsConceded },
      { label: "Saves", value: p.saves },
      { label: "Pens Saved", value: p.penaltiesSaved },
    ],
  },
  {
    label: "General",
    stats: (p: FplPlayerDetail) => [
      { label: "Minutes", value: p.minutes.toLocaleString() },
      { label: "Starts", value: p.starts },
      { label: "Yellow Cards", value: p.yellowCards },
      { label: "Red Cards", value: p.redCards },
      { label: "Own Goals", value: p.ownGoals },
    ],
  },
  {
    label: "FPL",
    stats: (p: FplPlayerDetail) => [
      { label: "Total Points", value: p.totalPoints },
      { label: "Form", value: p.form },
      { label: "Bonus", value: p.bonus },
      { label: "BPS", value: p.bps },
      { label: "Selected By", value: `${p.selectedBy}%` },
      { label: "Price", value: `£${p.price.toFixed(1)}m` },
    ],
  },
  {
    label: "ICT Index",
    stats: (p: FplPlayerDetail) => [
      { label: "Influence", value: p.influence.toFixed(1) },
      { label: "Creativity", value: p.creativity.toFixed(1) },
      { label: "Threat", value: p.threat.toFixed(1) },
      { label: "ICT Index", value: p.ictIndex.toFixed(1) },
    ],
  },
] as const;

export function PlayerStatsCard({ player }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {STAT_GROUPS.map((group) => {
        const stats = group.stats(player);
        // Hide defence group for attackers with all zeros
        if (group.label === "Defence" && stats.every((s) => s.value === 0)) return null;

        return (
          <div
            key={group.label}
            className="bg-stadium-surface border border-stadium-border p-4"
          >
            <h3 className="font-barlow font-semibold text-stadium-muted uppercase tracking-wider text-xs mb-3">
              {group.label}
            </h3>
            <div className="space-y-2">
              {stats.map((stat) => (
                <div key={stat.label} className="flex items-center justify-between">
                  <span className="font-inter text-stadium-muted text-xs">{stat.label}</span>
                  <span
                    className={cn(
                      "font-inter text-sm font-semibold",
                      (() => {
                        const n = typeof stat.value === "number" ? stat.value : parseFloat(String(stat.value));
                        return !isNaN(n) && n === 0;
                      })()
                        ? "text-stadium-muted"
                        : "text-white",
                    )}
                  >
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
