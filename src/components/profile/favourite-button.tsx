"use client";

import { useTransition, useState } from "react";
import { Heart } from "lucide-react";
import { toggleFavouritePlayer } from "@/app/actions/profile";
import { cn } from "@/lib/utils";

interface FavouriteButtonProps {
  playerId: number;
  playerName: string;
  playerPhoto: string;
  initialFavourited: boolean;
  isLoggedIn: boolean;
}

export function FavouriteButton({
  playerId,
  playerName,
  playerPhoto,
  initialFavourited,
  isLoggedIn,
}: FavouriteButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [favourited, setFavourited] = useState(initialFavourited);

  if (!isLoggedIn) {
    return (
      <a
        href="/auth/login"
        className="flex items-center gap-2 px-3 py-2 border border-stadium-border rounded-lg text-stadium-muted hover:border-white/30 hover:text-white font-inter text-sm transition-colors"
        title="Sign in to save favourites"
      >
        <Heart size={16} />
        Favourite
      </a>
    );
  }

  return (
    <button
      onClick={() => {
        startTransition(async () => {
          const result = await toggleFavouritePlayer(playerId, playerName, playerPhoto);
          if (result && "favourited" in result && result.favourited !== undefined) {
            setFavourited(result.favourited);
          }
        });
      }}
      disabled={isPending}
      className={cn(
        "flex items-center gap-2 px-3 py-2 border rounded-lg font-inter text-sm transition-all",
        favourited
          ? "bg-lfc-red/10 border-lfc-red/40 text-lfc-red hover:bg-lfc-red/20"
          : "border-stadium-border text-stadium-muted hover:border-white/30 hover:text-white"
      )}
    >
      <Heart
        size={16}
        className={cn(favourited && "fill-lfc-red")}
      />
      {favourited ? "Favourited" : "Favourite"}
    </button>
  );
}
