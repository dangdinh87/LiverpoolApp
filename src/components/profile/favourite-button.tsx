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
  const [error, setError] = useState<string | null>(null);

  if (!isLoggedIn) {
    return (
      <a
        href="/auth/login"
        className="flex items-center gap-2 px-3 py-2 border border-stadium-border rounded-none text-stadium-muted hover:border-white/30 hover:text-white font-inter text-sm transition-colors"
        title="Sign in to save favourites"
      >
        <Heart size={16} />
        Favourite
      </a>
    );
  }

  function handleToggle() {
    setError(null);
    const previousState = favourited;
    setFavourited(!previousState); // optimistic update

    startTransition(async () => {
      const result = await toggleFavouritePlayer(playerId, playerName, playerPhoto);
      if (result && "error" in result) {
        setFavourited(previousState); // revert on error
        setError(result.error ?? "Something went wrong");
      } else if (result && "favourited" in result) {
        setFavourited(result.favourited);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          "flex items-center gap-2 px-3 py-2 border rounded-none font-inter text-sm transition-all",
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
      {error && (
        <p className="text-red-400 font-inter text-xs">{error}</p>
      )}
    </div>
  );
}
