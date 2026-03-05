"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { FplMatchEntry, FplPastSeason } from "@/lib/fpl-data";

// ─── Match History Table ────────────────────────────────────────────────────────

interface MatchLogProps {
  matches: FplMatchEntry[];
}

export function PlayerMatchLog({ matches }: MatchLogProps) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? matches : matches.slice(0, 10);

  if (matches.length === 0) {
    return (
      <p className="text-stadium-muted font-inter text-sm py-6 text-center">
        No match history available yet.
      </p>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto border border-stadium-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stadium-surface2">
              <th className="px-3 py-2 text-left font-barlow font-semibold text-stadium-muted uppercase tracking-wider text-xs">GW</th>
              <th className="px-3 py-2 text-left font-barlow font-semibold text-stadium-muted uppercase tracking-wider text-xs">Opponent</th>
              <th className="px-2 py-2 text-center font-barlow font-semibold text-stadium-muted uppercase tracking-wider text-xs">Score</th>
              <th className="px-2 py-2 text-right font-barlow font-semibold text-stadium-muted uppercase tracking-wider text-xs">Min</th>
              <th className="px-2 py-2 text-right font-barlow font-semibold text-stadium-muted uppercase tracking-wider text-xs">G</th>
              <th className="px-2 py-2 text-right font-barlow font-semibold text-stadium-muted uppercase tracking-wider text-xs">A</th>
              <th className="px-2 py-2 text-right font-barlow font-semibold text-stadium-muted uppercase tracking-wider text-xs">xG</th>
              <th className="px-2 py-2 text-right font-barlow font-semibold text-stadium-muted uppercase tracking-wider text-xs">CS</th>
              <th className="px-2 py-2 text-right font-barlow font-semibold text-stadium-muted uppercase tracking-wider text-xs">Bon</th>
              <th className="px-2 py-2 text-right font-barlow font-semibold text-stadium-muted uppercase tracking-wider text-xs font-bold">Pts</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((m, i) => (
              <tr
                key={`${m.gameweek}-${i}`}
                className={cn(
                  "border-t border-stadium-border transition-colors",
                  i % 2 === 0 ? "bg-stadium-surface" : "bg-stadium-bg",
                )}
              >
                <td className="px-3 py-2 font-inter text-xs text-stadium-muted">{m.gameweek}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <Image
                      src={m.opponentBadge}
                      alt={m.opponentName}
                      width={14}
                      height={14}
                      unoptimized
                    />
                    <span className="font-inter text-xs text-white">
                      {m.opponentName}
                    </span>
                    <span className="text-stadium-muted text-[10px]">
                      ({m.wasHome ? "H" : "A"})
                    </span>
                  </div>
                </td>
                <td className="px-2 py-2 text-center font-inter text-xs text-white">
                  {m.homeScore}-{m.awayScore}
                </td>
                <td className="px-2 py-2 text-right font-inter text-xs text-stadium-muted">
                  {m.minutes > 0 ? m.minutes : "-"}
                </td>
                <td className="px-2 py-2 text-right font-inter text-xs text-white">{m.goals || "-"}</td>
                <td className="px-2 py-2 text-right font-inter text-xs text-white">{m.assists || "-"}</td>
                <td className="px-2 py-2 text-right font-inter text-xs text-stadium-muted">{m.xG.toFixed(1)}</td>
                <td className="px-2 py-2 text-right font-inter text-xs text-stadium-muted">{m.cleanSheets || "-"}</td>
                <td className="px-2 py-2 text-right font-inter text-xs text-stadium-muted">{m.bonus || "-"}</td>
                <td className={cn(
                  "px-2 py-2 text-right font-inter text-xs font-bold",
                  m.totalPoints >= 10 ? "text-green-400" :
                  m.totalPoints >= 5 ? "text-white" :
                  m.totalPoints <= 0 ? "text-red-400" :
                  "text-stadium-muted",
                )}>
                  {m.totalPoints}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {matches.length > 10 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-3 text-xs font-barlow font-semibold uppercase tracking-wider text-lfc-red hover:text-lfc-gold transition-colors"
        >
          Show all {matches.length} gameweeks
        </button>
      )}
    </div>
  );
}

// ─── Past Seasons ───────────────────────────────────────────────────────────────

interface PastSeasonsProps {
  seasons: FplPastSeason[];
}

export function PlayerPastSeasons({ seasons }: PastSeasonsProps) {
  if (seasons.length === 0) return null;

  return (
    <div className="overflow-x-auto border border-stadium-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-stadium-surface2">
            <th className="px-3 py-2 text-left font-barlow font-semibold text-stadium-muted uppercase tracking-wider text-xs">Season</th>
            <th className="px-2 py-2 text-right font-barlow font-semibold text-stadium-muted uppercase tracking-wider text-xs">Pts</th>
            <th className="px-2 py-2 text-right font-barlow font-semibold text-stadium-muted uppercase tracking-wider text-xs">Min</th>
            <th className="px-2 py-2 text-right font-barlow font-semibold text-stadium-muted uppercase tracking-wider text-xs">G</th>
            <th className="px-2 py-2 text-right font-barlow font-semibold text-stadium-muted uppercase tracking-wider text-xs">A</th>
            <th className="px-2 py-2 text-right font-barlow font-semibold text-stadium-muted uppercase tracking-wider text-xs">CS</th>
          </tr>
        </thead>
        <tbody>
          {seasons.map((s, i) => (
            <tr
              key={s.season}
              className={cn(
                "border-t border-stadium-border",
                i % 2 === 0 ? "bg-stadium-surface" : "bg-stadium-bg",
              )}
            >
              <td className="px-3 py-2 font-inter text-xs text-white">{s.season}</td>
              <td className="px-2 py-2 text-right font-inter text-xs font-bold text-white">{s.totalPoints}</td>
              <td className="px-2 py-2 text-right font-inter text-xs text-stadium-muted">{s.minutes.toLocaleString()}</td>
              <td className="px-2 py-2 text-right font-inter text-xs text-white">{s.goals || "-"}</td>
              <td className="px-2 py-2 text-right font-inter text-xs text-white">{s.assists || "-"}</td>
              <td className="px-2 py-2 text-right font-inter text-xs text-stadium-muted">{s.cleanSheets || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
