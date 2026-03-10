"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { PlayerCard } from "./player-card";
import type { PlayerPosition } from "@/lib/squad-data";
import { POSITION_DISPLAY, POSITION_ORDER } from "@/lib/squad-data";
import { cn } from "@/lib/utils";

// Serializable player type for client component (matches LfcPlayer shape)
interface ClientPlayer {
  id: number;
  name: string;
  shirtNumber: number;
  shirtName: string;
  slug: string;
  position: PlayerPosition;
  nationality: string;
  dateOfBirth: string;
  onLoan: boolean;
  forever: boolean;
  photo: string;
  photoLg: string;
  bodyShot: string;
  localPhoto: string;
  localBodyShot: string;
  bio: string;
  honors: string[];
  metaDescription: string;
}

type PositionFilter = "All" | PlayerPosition;

interface SquadGridProps {
  players: ClientPlayer[];
  /** Optional slot rendered after position filters (e.g. injury widget) */
  actionSlot?: React.ReactNode;
}

export function SquadGrid({ players, actionSlot }: SquadGridProps) {
  const [filter, setFilter] = useState<PositionFilter>("All");
  const [search, setSearch] = useState("");
  const t = useTranslations("Squad");

  const FILTERS: { label: string; value: PositionFilter }[] = [
    { label: t("positions.all"), value: "All" },
    { label: t("positions.GK"), value: "goalkeeper" },
    { label: t("positions.DEF"), value: "defender" },
    { label: t("positions.MID"), value: "midfielder" },
    { label: t("positions.FWD"), value: "forward" },
  ];

  const sorted = useMemo(() => {
    let list = filter === "All" ? players : players.filter((p) => p.position === filter);

    // Search by name or number
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          String(p.shirtNumber).includes(q)
      );
    }

    return [...list].sort((a, b) => {
      const posOrder = POSITION_ORDER[a.position] - POSITION_ORDER[b.position];
      if (posOrder !== 0) return posOrder;
      return (a.shirtNumber ?? 99) - (b.shirtNumber ?? 99);
    });
  }, [players, filter, search]);

  return (
    <div>
      {/* Toolbar: filters + search + action slot */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        {/* Position filter tabs */}
        {FILTERS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={cn(
              "px-4 py-2 rounded-none font-barlow font-semibold text-sm uppercase tracking-wider transition-all duration-200",
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

        {/* Search input */}
        <div className="relative ml-auto">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stadium-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search")}
            className="pl-8 pr-3 py-2 w-44 rounded-none bg-stadium-surface border border-stadium-border text-white text-sm font-inter placeholder:text-stadium-muted/60 focus:outline-none focus:border-lfc-red/50 transition-colors"
          />
        </div>

        {/* Action slot (injury widget) */}
        {actionSlot}
      </div>

      {/* Player grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {sorted.map((player) => (
          <PlayerCard key={player.id} player={player} />
        ))}
      </div>

      {sorted.length === 0 && (
        <p className="text-stadium-muted text-center py-12 font-inter">
          {search ? t("noPlayers", { search }) : t("noPlayersFilter")}
        </p>
      )}
    </div>
  );
}
