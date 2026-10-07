"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, UserX } from "lucide-react";
import { useTranslations } from "next-intl";
import { PlayerCard, type SquadCardPlayer } from "./player-card";
import { EmptyState } from "@/components/ui/empty-state";
import { useFavourites } from "@/hooks/use-favourites";
import { useToast } from "@/stores/toast-store";
import { POSITION_ORDER, type PlayerPosition } from "@/lib/squad-positions";
import { cn } from "@/lib/utils";

const POSITIONS: PlayerPosition[] = ["goalkeeper", "defender", "midfielder", "forward"];

interface SquadGridProps {
  players: SquadCardPlayer[];
}

const byNumber = (a: SquadCardPlayer, b: SquadCardPlayer) =>
  POSITION_ORDER[a.position] - POSITION_ORDER[b.position] || (a.shirtNumber || 99) - (b.shirtNumber || 99);

/** Every position group stays on the page; the sticky chips jump between them. */
export function SquadGrid({ players }: SquadGridProps) {
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<PlayerPosition | null>(null);
  const chipsRef = useRef<HTMLUListElement>(null);
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

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = players.filter((p) => !q || p.name.toLowerCase().includes(q) || String(p.shirtNumber).includes(q));
    return POSITIONS.map((pos) => ({ pos, items: matches.filter((p) => p.position === pos).sort(byNumber) })).filter(
      (g) => g.items.length > 0,
    );
  }, [players, search]);

  // Highlight the chip of the group being read.
  useEffect(() => {
    const targets = groups
      .map((g) => document.getElementById(`pos-${g.pos}`))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        setActive(visible[0].target.id.replace("pos-", "") as PlayerPosition);
      },
      { rootMargin: "-25% 0px -65% 0px" },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [groups]);

  // Keep the active chip visible in the strip (never scrolls the page).
  useEffect(() => {
    const strip = chipsRef.current;
    const chip = active ? strip?.querySelector<HTMLElement>(`[data-pos="${active}"]`) : null;
    if (!strip || !chip) return;
    strip.scrollTo({ left: Math.max(0, chip.offsetLeft - (strip.clientWidth - chip.offsetWidth) / 2), behavior: "auto" });
  }, [active]);

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
          autoComplete="off"
          enterKeyHint="search"
          className="h-11 w-full border border-[var(--line-strong)] bg-[var(--surface-1)] pl-9 pr-3 text-base text-white placeholder:text-stadium-muted focus:border-lfc-red focus:outline-none sm:max-w-sm sm:text-sm"
        />
      </label>

      {groups.length > 1 && (
        <nav
          aria-label={t("positionsLabel")}
          className="sticky top-[var(--header-h)] z-30 -mx-4 mt-4 border-b border-[var(--line)] bg-stadium-bg/90 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        >
          <ul ref={chipsRef} className="scroll-x flex gap-1.5 sm:gap-2">
            {groups.map(({ pos, items }) => {
              const isActive = active === pos;
              return (
                <li key={pos} data-pos={pos} className="min-w-0 flex-1 sm:flex-none">
                  <a
                    href={`#pos-${pos}`}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "flex min-h-11 w-full items-center justify-center gap-1.5 border px-1.5 font-barlow text-[13px] font-semibold uppercase tracking-[0.06em] whitespace-nowrap sm:inline-flex sm:w-auto sm:px-4 sm:text-sm sm:tracking-[0.08em]",
                      "transition-colors duration-[var(--dur-base)] ease-[var(--ease-out)]",
                      isActive
                        ? "border-lfc-red bg-lfc-red text-white"
                        : "border-[var(--line-strong)] bg-[var(--surface-1)] text-stadium-muted hover:border-white/40 hover:text-white",
                    )}
                  >
                    {t(`groups.${pos}`)}
                    <span className={cn("hidden text-xs tabular-nums sm:inline", isActive ? "text-white" : "text-stadium-muted")}>{items.length}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {groups.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<UserX className="size-9" aria-hidden />}
          title={t("noPlayersTitle")}
          description={t("noPlayers", { search })}
        />
      ) : (
        <div className="mt-6 space-y-8 sm:space-y-10">
          {groups.map(({ pos, items }) => (
            <section key={pos} id={`pos-${pos}`} aria-labelledby={`pos-${pos}-title`} className="scroll-mt-[3.75rem]">
              <h2 id={`pos-${pos}-title`} className="mb-3 flex items-baseline gap-3 font-bebas text-3xl leading-none text-white sm:mb-4">
                {t(`groups.${pos}`)}
                <span className="font-barlow text-sm font-semibold tracking-wider text-stadium-muted">{items.length}</span>
              </h2>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
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
