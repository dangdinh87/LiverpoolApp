"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

interface FavouriteHeartProps {
  playerId: number;
  playerName: string;
  playerPhoto: string;
  isFavourited: boolean;
  isLoggedIn: boolean;
  onToggle: (playerId: number, added: boolean) => void;
  onNotify?: (playerName: string, added: boolean) => void;
}

export function FavouriteHeart({
  playerId,
  playerName,
  playerPhoto,
  isFavourited,
  isLoggedIn,
  onToggle,
  onNotify,
}: FavouriteHeartProps) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();
  const t = useTranslations("Profile");

  if (!isLoggedIn) {
    return (
      <button
        type="button"
        className="absolute top-2 right-2 z-10 p-1.5 bg-black/60 backdrop-blur-sm border border-white/10 text-stadium-muted hover:text-white transition-all hover:scale-110 cursor-pointer"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          router.push("/auth/login");
        }}
      >
        <Heart size={14} />
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

      <motion.button
        onClick={handleClick}
        disabled={isPending}
        whileTap={{ scale: 0.85 }}
        className={cn(
          "absolute top-2 right-2 z-10 p-1.5 backdrop-blur-sm border transition-all",
          isFavourited
            ? "bg-lfc-red/20 border-lfc-red/40 text-lfc-red hover:bg-lfc-red/30"
            : "bg-black/60 border-white/10 text-stadium-muted hover:text-white hover:border-white/30"
        )}
        title={isFavourited ? t("removeFav") : t("favourite")}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={isFavourited ? "filled" : "empty"}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.3, opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="block"
          >
            <Heart size={14} className={cn(isFavourited && "fill-lfc-red")} />
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </>
  );
}
