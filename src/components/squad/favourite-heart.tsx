"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { toggleFavouritePlayer } from "@/app/actions/profile";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

// 40x40 hit area, colour-only transitions, a quick press scale (transform only).
const HEART_BASE =
  "z-10 inline-flex size-10 cursor-pointer items-center justify-center transition-[background-color,color,border-color,transform] duration-[var(--dur-base)] ease-[var(--ease-out)] active:scale-90";

interface FavouriteHeartProps {
  playerId: number;
  playerName: string;
  playerPhoto: string;
  isFavourited: boolean;
  isLoggedIn: boolean;
  onToggle: (playerId: number, added: boolean) => void;
  onNotify?: (playerName: string, added: boolean) => void;
  variant?: "overlay" | "inline";
}

export function FavouriteHeart({
  playerId,
  playerName,
  playerPhoto,
  isFavourited,
  isLoggedIn,
  onToggle,
  onNotify,
  variant = "overlay",
}: FavouriteHeartProps) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();
  const t = useTranslations("Profile");

  if (!isLoggedIn) {
    return (
      <button
        type="button"
        className={cn(
          HEART_BASE,
          variant === "overlay"
            ? "absolute top-1 right-1 bg-black/55 text-white/80 hover:text-white"
            : "relative border border-white/10 bg-white/5 text-stadium-muted hover:text-white hover:border-white/30"
        )}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          router.push("/auth/login");
        }}
        aria-label={t("favourite")}
      >
        <Heart size={18} aria-hidden />
      </button>
    );
  }

  function doToggle() {
    const next = !isFavourited;
    onToggle(playerId, next);

    startTransition(async () => {
      const result = await toggleFavouritePlayer(playerId, playerName, playerPhoto);
      if (result && "error" in result) {
        onToggle(playerId, !next); // revert
      } else {
        onNotify?.(playerName, next);
      }
    });
  }

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (isFavourited) {
      setShowConfirm(true);
    } else {
      doToggle();
    }
  }

  return (
    <>
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="bg-stadium-surface border-stadium-border" onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-bebas text-2xl tracking-wider">
              {t("confirmRemoveFav", { name: playerName })}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-stadium-muted font-inter">
              {t("confirmRemoveFavDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-stadium-surface2 border-stadium-border text-white hover:bg-stadium-surface hover:text-white cursor-pointer">
              {t("cancelAction")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setShowConfirm(false); doToggle(); }}
              className="bg-lfc-red hover:bg-lfc-red/80 text-white cursor-pointer"
            >
              {t("confirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={cn(
          HEART_BASE,
          "disabled:opacity-60",
          variant === "overlay" ? "absolute top-1 right-1" : "relative",
          isFavourited
            ? "bg-lfc-red/25 text-white hover:bg-lfc-red/35"
            : variant === "overlay"
              ? "bg-black/55 text-white/80 hover:text-white"
              : "border border-white/10 text-stadium-muted hover:text-white hover:border-white/30"
        )}
        title={isFavourited ? t("removeFav") : t("favourite")}
        aria-label={isFavourited ? t("removeFav") : t("favourite")}
        aria-pressed={isFavourited}
      >
        <Heart size={18} aria-hidden className={cn(isFavourited && "fill-lfc-red text-lfc-red")} />
      </button>
    </>
  );
}
