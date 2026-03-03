"use client";

import { useState } from "react";
import { PlayerCard } from "./player-card";
import type { Player } from "@/lib/types/football";
import { cn } from "@/lib/utils";

type PositionFilter = "All" | "Goalkeeper" | "Defender" | "Midfielder" | "Attacker";

const FILTERS: { label: string; value: PositionFilter }[] = [
  { label: "All", value: "All" },
  { label: "GK", value: "Goalkeeper" },
  { label: "DEF", value: "Defender" },
  { label: "MID", value: "Midfielder" },
  { label: "FWD", value: "Attacker" },
];

// Module-scope constant — not recreated on every render
const POSITION_ORDER: Record<Exclude<PositionFilter, "All">, number> = {
  Goalkeeper: 0,
  Defender: 1,
  Midfielder: 2,
  Attacker: 3,
};

interface SquadGridProps {
  players: Player[];
}

export function SquadGrid({ players }: SquadGridProps) {
  const [filter, setFilter] = useState<PositionFilter>("All");

  const filtered =
    filter === "All" ? players : players.filter((p) => p.position === filter);

  const sorted = [...filtered].sort((a, b) => {
    const posOrder = POSITION_ORDER[a.position] - POSITION_ORDER[b.position];
    if (posOrder !== 0) return posOrder;
    return (a.number ?? 99) - (b.number ?? 99);
  });

  return (
    <div>
      {/* Position filter tabs */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {FILTERS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={cn(
              "px-4 py-2 rounded-lg font-barlow font-semibold text-sm uppercase tracking-wider transition-all duration-200",
              filter === value
                ? "bg-lfc-red text-white"
                : "bg-stadium-surface text-stadium-muted border border-stadium-border hover:border-white/30 hover:text-white"
            )}
          >
            {label}
            <span className="ml-2 text-xs opacity-60">
              {value === "All"
                ? players.length
                : players.filter((p) => p.position === value).length}
            </span>
          </button>
        ))}
      </div>

      {/* Player grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {sorted.map((player) => (
          <PlayerCard key={player.id} player={player} />
        ))}
      </div>

      {sorted.length === 0 && (
        <p className="text-stadium-muted text-center py-12 font-inter">
          No players found for this filter.
        </p>
      )}
    </div>
  );
}
