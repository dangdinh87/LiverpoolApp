import Image from "next/image";
import type { Standing } from "@/lib/types/football";
import { cn } from "@/lib/utils";

const RESULT_DOT_COLORS = {
  W: "bg-green-500",
  D: "bg-yellow-500",
  L: "bg-red-500",
};

interface StandingsTableProps {
  standings: Standing[];
}

export function StandingsTable({ standings }: StandingsTableProps) {
  // Max points for progress bar scaling (leader's points)
  const maxPoints = standings[0]?.points ?? 1;

  return (
    <div className="bg-stadium-surface border border-stadium-border rounded-xl overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-[2rem_1fr_3rem_3rem_3rem_3rem_4rem_4rem_auto] gap-2 px-4 py-3 border-b border-stadium-border">
        {["#", "Club", "P", "W", "D", "L", "GD", "Pts", "Form"].map((h) => (
          <span
            key={h}
            className="font-barlow font-semibold text-xs uppercase tracking-wider text-stadium-muted"
          >
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-stadium-border/50">
        {standings.map((standing) => {
          const isLiverpool = standing.team.id === 40;
          const form = standing.form?.split("") ?? [];

          return (
            <div key={standing.team.id}>
              {/* Main row */}
              <div
                className={cn(
                  "grid grid-cols-[2rem_1fr_3rem_3rem_3rem_3rem_4rem_4rem_auto] gap-2 px-4 py-3 items-center transition-colors",
                  isLiverpool
                    ? "bg-lfc-red/10 border-l-4 border-l-lfc-red"
                    : "hover:bg-stadium-surface2"
                )}
              >
                {/* Rank */}
                <span
                  className={cn(
                    "font-bebas text-lg",
                    isLiverpool ? "text-lfc-red" : "text-stadium-muted"
                  )}
                >
                  {standing.rank}
                </span>

                {/* Club name + logo */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative w-5 h-5 flex-shrink-0">
                    <Image
                      src={standing.team.logo}
                      alt={standing.team.name}
                      fill
                      sizes="20px"
                      className="object-contain"
                      loading="lazy"
                    />
                  </div>
                  <span
                    className={cn(
                      "font-inter text-sm truncate",
                      isLiverpool ? "text-white font-semibold" : "text-stadium-muted"
                    )}
                  >
                    {standing.team.name}
                  </span>
                </div>

                {/* P, W, D, L */}
                {[standing.all.played, standing.all.win, standing.all.draw, standing.all.lose].map(
                  (val, i) => (
                    <span
                      key={i}
                      className={cn(
                        "font-inter text-sm text-center",
                        isLiverpool ? "text-white" : "text-stadium-muted"
                      )}
                    >
                      {val}
                    </span>
                  )
                )}

                {/* GD */}
                <span
                  className={cn(
                    "font-inter text-sm text-center",
                    standing.goalsDiff > 0
                      ? "text-green-400"
                      : standing.goalsDiff < 0
                      ? "text-red-400"
                      : "text-stadium-muted"
                  )}
                >
                  {standing.goalsDiff > 0 ? `+${standing.goalsDiff}` : standing.goalsDiff}
                </span>

                {/* Points */}
                <span
                  className={cn(
                    "font-bebas text-xl text-center",
                    isLiverpool ? "text-lfc-red" : "text-white"
                  )}
                >
                  {standing.points}
                </span>

                {/* Form dots */}
                <div className="flex gap-1 items-center">
                  {form.slice(-5).map((r, i) => (
                    <span
                      key={i}
                      className={cn(
                        "w-2.5 h-2.5 rounded-full",
                        RESULT_DOT_COLORS[r as keyof typeof RESULT_DOT_COLORS] ??
                          "bg-stadium-muted"
                      )}
                      title={r === "W" ? "Win" : r === "D" ? "Draw" : "Loss"}
                    />
                  ))}
                </div>
              </div>

              {/* Points progress bar — only shown for Liverpool row */}
              {isLiverpool && (
                <div className="px-4 pb-3 bg-lfc-red/10 border-l-4 border-l-lfc-red">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-stadium-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-lfc-red rounded-full transition-all duration-700"
                        style={{ width: `${(standing.points / maxPoints) * 100}%` }}
                      />
                    </div>
                    <span className="text-lfc-red text-xs font-barlow font-semibold">
                      {standing.points} pts
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-stadium-border flex gap-4 flex-wrap">
        {[
          { color: "bg-blue-500", label: "Champions League" },
          { color: "bg-orange-500", label: "Europa League" },
          { color: "bg-red-500", label: "Relegation" },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-xs text-stadium-muted font-inter">
            <span className={cn("w-2.5 h-2.5 rounded-sm", color)} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
