"use client";

import { useCallback, useMemo, useState } from "react";
import { Search, UserX } from "lucide-react";
import { useTranslations } from "next-intl";
import { PlayerCard, type SquadCardPlayer } from "./player-card";
import { ChipBar } from "@/components/fixtures/chip-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { useFavourites } from "@/hooks/use-favourites";
import { useToast } from "@/stores/toast-store";
import { POSITION_ORDER, type PlayerPosition } from "@/lib/squad-positions";

type PositionFilter = "All" | PlayerPosition;

const POSITIONS: PlayerPosition[] = ["goalkeeper", "defender", "midfielder", "forward"];
const TAB_KEY = { goalkeeper: "GK", defender: "DEF", midfielder: "MID", forward: "FWD" } as const;

interface SquadGridProps {
  players: SquadCardPlayer[];
}

const byNumber = (a: SquadCardPlayer, b: SquadCardPlayer) =>
  POSITION_ORDER[a.position] - POSITION_ORDER[b.position] || (a.shirtNumber || 99) - (b.shirtNumber || 99);

export function SquadGrid({ players }: SquadGridProps) {
  const [filter, setFilter] = useState<PositionFilter>("All");
  const [search, setSearch] = useState("");
  const t = useTranslations("Squad");
  const pt = useTranslations("Profile");
  const { ids: favouriteIds, isLoggedIn, toggle: toggleFavourite } = useFavourites();
  const { show: showToast } = useToast();

  const handleNotify = useCallback(
    (playerName: string, added: boolean) => {
      showToast({
        type: "favourite",
        message: added ? pt("favAdded", { name: playerName }) : pt("favRemoved", { name: playerName }),
      });
    },
    [pt, showToast],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: players.length };
    for (const p of POSITIONS) c[p] = players.filter((x) => x.position === p).length;
    return c;
  }, [players]);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = players.filter(
      (p) =>
        (filter === "All" || p.position === filter) &&
        (!q || p.name.toLowerCase().includes(q) || String(p.shirtNumber).includes(q)),
    );
    return POSITIONS.map((pos) => ({ pos, items: matches.filter((p) => p.position === pos).sort(byNumber) })).filter(
      (g) => g.items.length > 0,
    );
  }, [players, filter, search]);

  const tabs = [
    { key: "All", label: t("positions.all"), count: counts.All },
    ...POSITIONS.map((pos) => ({ key: pos, label: t(`positions.${TAB_KEY[pos]}`), count: counts[pos] })),
  ];

  return (
    <div>
      <label className="relative block">
        <span className="sr-only">{t("searchLabel")}</span>
        <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stadium-muted" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("search")}
          className="h-11 w-full border border-[var(--line-strong)] bg-[var(--surface-1)] pl-9 pr-3 text-base text-white placeholder:text-stadium-muted focus:border-lfc-red focus:outline-none sm:max-w-sm sm:text-sm"
        />
      </label>

      <ChipBar
        sticky
        className="mt-4"
        ariaLabel={t("positionsLabel")}
        items={tabs}
        active={filter}
        onSelect={(k) => setFilter(k as PositionFilter)}
      />

      {groups.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<UserX className="size-9" aria-hidden />}
          title={t("noPlayersTitle")}
          description={search ? t("noPlayers", { search }) : t("noPlayersFilter")}
        />
      ) : (
        <div className="mt-6 space-y-10">
          {groups.map(({ pos, items }) => (
            <section key={pos} aria-labelledby={`pos-${pos}`}>
              <h2 id={`pos-${pos}`} className="mb-4 flex items-baseline gap-3 font-bebas text-3xl leading-none text-white">
                {t(`groups.${pos}`)}
                <span className="font-barlow text-sm font-semibold tracking-wider text-stadium-muted">{items.length}</span>
              </h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                {items.map((player) => (
                  <li key={player.id}>
                    <PlayerCard
                      player={player}
                      isFavourited={favouriteIds.has(player.id)}
                      isLoggedIn={isLoggedIn}
                      onToggleFavourite={toggleFavourite}
                      onFavNotify={handleNotify}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
