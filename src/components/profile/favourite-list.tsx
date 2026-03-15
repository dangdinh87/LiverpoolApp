"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, X } from "lucide-react";
import { useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { toggleFavouritePlayer } from "@/app/actions/profile";
import { useToast } from "@/stores/toast-store";
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
import type { FavouritePlayer } from "@/lib/supabase";
import { getPlayerById } from "@/lib/squad-data";

interface FavouriteListProps {
  favourites: FavouritePlayer[];
}

export function FavouriteList({ favourites: initialFavourites }: FavouriteListProps) {
  const [favourites, setFavourites] = useState(initialFavourites);
  const [isPending, startTransition] = useTransition();
  const { show: showToast } = useToast();
  const t = useTranslations("Profile");
  const [confirmTarget, setConfirmTarget] = useState<FavouritePlayer | null>(null);

  function handleRemove(fav: FavouritePlayer) {
    setConfirmTarget(null);
    // Optimistic removal
    setFavourites((prev) => prev.filter((f) => f.player_id !== fav.player_id));

    startTransition(async () => {
      const result = await toggleFavouritePlayer(
        fav.player_id,
        fav.player_name,
        fav.player_photo ?? ""
      );
      if (result && "error" in result) {
        // Revert on error
        setFavourites((prev) => [fav, ...prev]);
        showToast({ type: "error", message: t("favError") });
      } else {
        showToast({
          type: "favourite",
          message: t("favRemoved", { name: fav.player_name }),
        });
      }
    });
  }

  if (favourites.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <Heart size={32} className="text-stadium-muted/40" />
        <p className="font-inter text-stadium-muted text-sm text-center">
          {t("favouritePlayersEmpty")}
        </p>
        <Link
          href="/squad"
          className="font-inter text-sm text-lfc-red hover:underline"
        >
          {t("browseSquad")}
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Confirm dialog */}
      <AlertDialog
        open={!!confirmTarget}
        onOpenChange={(v) => { if (!v) setConfirmTarget(null); }}
      >
        <AlertDialogContent className="bg-stadium-surface border-stadium-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-bebas text-2xl tracking-wider">
              {confirmTarget && t("confirmRemoveFav", { name: confirmTarget.player_name })}
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
              onClick={() => confirmTarget && handleRemove(confirmTarget)}
              className="bg-lfc-red hover:bg-lfc-red/80 text-white cursor-pointer"
            >
              {t("confirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        <AnimatePresence>
          {favourites.map((fav) => (
            <motion.div
              key={fav.player_id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="bg-stadium-surface border border-stadium-border overflow-hidden group relative"
            >
              <Link href={`/player/${getPlayerById(fav.player_id)?.slug ?? fav.player_id}`} className="block">
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
                <div className="px-3 py-2.5 flex items-center justify-between gap-1">
                  <p className="font-inter text-xs text-white font-semibold truncate group-hover:text-lfc-red transition-colors">
                    {fav.player_name}
                  </p>
                  <Heart size={12} className="text-lfc-red fill-lfc-red shrink-0" />
                </div>
              </Link>

              {/* Remove button — visible on hover */}
              <button
                onClick={() => setConfirmTarget(fav)}
                disabled={isPending}
                className="absolute top-1.5 right-1.5 p-1 bg-black/70 backdrop-blur-sm border border-white/10 text-stadium-muted hover:text-white hover:border-red-500/40 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                aria-label={t("removeFav")}
              >
                <X size={12} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
