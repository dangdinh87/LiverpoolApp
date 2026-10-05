"use client";

import Link from "next/link";
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

const POSITION_KEY: Record<PlayerPosition, "GK" | "DEF" | "MID" | "FWD"> = {
  goalkeeper: "GK",
  defender: "DEF",
  midfielder: "MID",
  forward: "FWD",
};

interface PlayerCardProps {
  player: SquadCardPlayer;
  isFavourited?: boolean;
  isLoggedIn?: boolean;
  onToggleFavourite?: (playerId: number, added: boolean) => void;
  onFavNotify?: (playerName: string, added: boolean) => void;
}

export function PlayerCard({ player, isFavourited = false, isLoggedIn = false, onToggleFavourite, onFavNotify }: PlayerCardProps) {
  const t = useTranslations("Squad");

  return (
    <div className="group relative">
      <Link href={`/player/${player.slug}`} className="surface-interactive block overflow-hidden">
        {/* Fixed aspect box: no layout shift while the photo loads */}
        <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-b from-[var(--surface-3)] to-[var(--surface-1)]">
          {player.shirtNumber > 0 && (
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-0 right-1 select-none font-bebas text-[6.5rem] leading-[0.8] text-white/[0.09]"
            >
              {player.shirtNumber}
            </span>
          )}
          <PlayerPhoto
            src={player.localPhoto}
            alt=""
            sizes="(min-width:1280px) 20vw, (min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
          />
          {player.shirtNumber > 0 && (
            <span className="absolute left-3 top-2 font-bebas text-3xl leading-none text-white">{player.shirtNumber}</span>
          )}
        </div>

        <div className="p-3 sm:p-4">
          <h3 className="line-clamp-2 min-h-10 font-inter text-[15px] font-semibold leading-5 text-white">{player.name}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-barlow text-xs font-semibold uppercase tracking-[0.1em] text-stadium-muted">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className={cn("size-2 rounded-full", POSITION_DOT[player.position])} />
              {t(`positions.${POSITION_KEY[player.position]}`)}
            </span>
            {player.onLoan && <span className="text-lfc-gold">{t("status.onLoan")}</span>}
            {player.forever && <span className="text-lfc-gold">{t("status.forever")}</span>}
          </div>
        </div>
      </Link>

      {/* Sibling of the link (not nested inside it): a 40px+ hit area with an accessible name */}
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
        />
      )}
    </div>
  );
}
