"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toggleFavouritePlayer } from "@/app/actions/profile";
import type { FavouritePlayer } from "@/lib/supabase";

interface FavouriteListProps {
  favourites: FavouritePlayer[];
}

export function FavouriteList({ favourites }: FavouriteListProps) {
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("Profile");

  if (favourites.length === 0) {
    return (
      <p className="font-inter text-stadium-muted text-sm py-8 text-center">
        {t("favouritePlayersEmpty")}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {favourites.map((fav) => (
        <div
          key={fav.player_id}
          className="bg-stadium-surface border border-stadium-border rounded-none overflow-hidden group"
        >
          <Link href={`/player/${fav.player_id}`} className="block">
            <div className="relative h-28 bg-stadium-surface2">
              {fav.player_photo ? (
                <Image
                  src={fav.player_photo}
                  alt={fav.player_name}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-contain object-bottom"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stadium-muted text-3xl font-bebas">
                  {fav.player_name[0]}
                </div>
              )}
            </div>
            <p className="font-inter text-xs text-white font-semibold px-3 pt-2 truncate group-hover:text-lfc-red transition-colors">
              {fav.player_name}
            </p>
          </Link>
          <div className="px-3 pb-3 pt-1">
            <button
              onClick={() =>
                startTransition(async () => {
                  await toggleFavouritePlayer(
                    fav.player_id,
                    fav.player_name,
                    fav.player_photo ?? ""
                  );
                })
              }
              disabled={isPending}
              className="flex items-center gap-1 text-lfc-red font-inter text-xs hover:text-white transition-colors"
              aria-label="Remove favourite"
            >
              <Heart size={12} className="fill-lfc-red" />
              {t("removeFav")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
