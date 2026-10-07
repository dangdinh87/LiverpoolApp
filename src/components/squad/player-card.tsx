"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { FavouriteHeart } from "./favourite-heart";
import { PlayerPhoto } from "@/components/player/player-photo";
import type { PlayerPosition } from "@/lib/squad-positions";
import { cn } from "@/lib/utils";

/** Only what a card needs: keeps the client payload small (no bios or honours). */
export interface SquadCardPlayer {
  id: number;
  name: string;
  shirtNumber: number;
  shirtName: string;
  slug: string;
  position: PlayerPosition;
  /** Computed on the server so the card never reads the clock during hydration. */
  age: number;
  onLoan: boolean;
  forever: boolean;
  photo: string;
  localPhoto: string;
}

const POSITION_DOT: Record<PlayerPosition, string> = {
  goalkeeper: "bg-yellow-400",
  defender: "bg-blue-400",
  midfielder: "bg-green-500",
  forward: "bg-lfc-red",
};

interface PlayerCardProps {
  player: SquadCardPlayer;
  isFavourited?: boolean;
  isLoggedIn?: boolean;
  onToggleFavourite?: (playerId: number, added: boolean) => void;
  onFavNotify?: (playerName: string, added: boolean) => void;
}

/**
 * One card, two shapes. Phones (390px) get a compact 72px row — thumbnail,
 * shirt number, full name, position and age — so 31 players scan in about
 * 2,400px instead of 7,000. From `sm` it is the photo card.
 */
export function PlayerCard({ player, isFavourited = false, isLoggedIn = false, onToggleFavourite, onFavNotify }: PlayerCardProps) {
  const t = useTranslations("Squad");

  return (
    <div className="group relative">
      <Link
        href={`/player/${player.slug}`}
        className="surface-interactive flex min-h-[4.5rem] items-center gap-3 overflow-hidden p-2 pr-14 sm:block sm:min-h-0 sm:p-0"
      >
        {/* Fixed box: no layout shift while the photo loads */}
        <div className="relative size-16 shrink-0 overflow-hidden bg-gradient-to-b from-[var(--surface-3)] to-[var(--surface-1)] sm:aspect-[4/5] sm:size-auto">
          {player.shirtNumber > 0 && (
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-0 right-1 hidden select-none font-bebas text-[6.5rem] leading-[0.8] text-white/[0.09] sm:block"
            >
              {player.shirtNumber}
            </span>
          )}
          <PlayerPhoto
            src={player.localPhoto}
            alt=""
            sizes="(min-width:1280px) 20vw, (min-width:1024px) 25vw, (min-width:640px) 33vw, 64px"
            className="object-cover object-top sm:object-contain sm:object-bottom"
          />
          {player.shirtNumber > 0 && (
            <span className="absolute left-3 top-2 hidden font-bebas text-3xl leading-none text-white sm:block">{player.shirtNumber}</span>
          )}
        </div>

        <div className="min-w-0 flex-1 sm:p-4">
          <div className="flex items-baseline gap-2">
            {player.shirtNumber > 0 && (
              <span aria-hidden className="w-7 shrink-0 font-bebas text-2xl leading-none text-brand sm:hidden">
                {player.shirtNumber}
              </span>
            )}
            <h3 className="min-w-0 font-inter text-[15px] font-semibold leading-5 text-white [overflow-wrap:anywhere] sm:line-clamp-2 sm:min-h-10">
              {player.name}
            </h3>
          </div>
          <p
            className={cn(
              "mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] leading-5 text-stadium-muted sm:mt-2 sm:pl-0",
              player.shirtNumber > 0 && "pl-9",
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className={cn("size-2 rounded-full", POSITION_DOT[player.position])} />
              {t(`groups.${player.position}`)}
            </span>
            <span aria-hidden>·</span>
            <span>{t("card.age", { age: player.age })}</span>
            {player.onLoan && <span className="text-lfc-gold">{t("status.onLoan")}</span>}
            {player.forever && <span className="text-lfc-gold">{t("status.forever")}</span>}
          </p>
        </div>
      </Link>

      {/* Sibling of the link (not nested inside it): a 44px hit area with an accessible name */}
      {onToggleFavourite && (
        <FavouriteHeart
          playerId={player.id}
          playerName={player.name}
          playerPhoto={player.photo}
          isFavourited={isFavourited}
          isLoggedIn={isLoggedIn}
          onToggle={onToggleFavourite}
          onNotify={onFavNotify}
          variant="overlay"
          className="top-1/2 right-1 -translate-y-1/2 max-sm:bg-transparent sm:top-1 sm:translate-y-0"
        />
      )}
    </div>
  );
}
