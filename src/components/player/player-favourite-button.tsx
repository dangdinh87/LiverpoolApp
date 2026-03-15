"use client";

import { useState, useEffect, useTransition } from "react";
import { Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase";
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
import { cn } from "@/lib/utils";

interface PlayerFavouriteButtonProps {
  playerId: number;
  playerName: string;
  playerPhoto: string;
}

/**
 * Self-initializing favourite button for player detail page.
 * Checks auth + favourite status client-side (works with static pages).
 */
export function PlayerFavouriteButton({
  playerId,
  playerName,
  playerPhoto,
}: PlayerFavouriteButtonProps) {
  const [state, setState] = useState<"loading" | "guest" | "idle">("loading");
  const [favourited, setFavourited] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const { show: showToast } = useToast();
  const t = useTranslations("Profile");

  useEffect(() => {
    const supabase = createClient();

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState("guest");
        return;
      }

      const { data } = await supabase
        .from("favourite_players")
        .select("id")
        .eq("user_id", user.id)
        .eq("player_id", playerId)
        .maybeSingle();

      setFavourited(!!data);
      setState("idle");
    }

    init();
  }, [playerId]);

  if (state === "loading") {
    return (
      <div className="inline-flex items-center gap-2.5 px-4 py-2.5 border border-stadium-border text-stadium-muted font-inter text-sm">
        <Heart size={16} className="animate-pulse" />
        <span className="animate-pulse">{t("favourite")}</span>
      </div>
    );
  }

  if (state === "guest") {
    return (
      <a
        href="/auth/login"
        className="inline-flex items-center gap-2.5 px-4 py-2.5 border border-stadium-border text-stadium-muted hover:border-lfc-red/40 hover:text-white font-inter text-sm transition-all group"
        title={t("loginToFav")}
      >
        <Heart size={16} className="transition-transform group-hover:scale-110" />
        {t("favourite")}
      </a>
    );
  }

  function doToggle() {
    const prev = favourited;
    setFavourited(!prev);

    startTransition(async () => {
      const result = await toggleFavouritePlayer(playerId, playerName, playerPhoto);
      if (result && "error" in result) {
        setFavourited(prev);
        showToast({ type: "error", message: t("favError") });
      } else if (result && "favourited" in result) {
        setFavourited(result.favourited);
        showToast({
          type: "success",
          message: result.favourited
            ? t("favAdded", { name: playerName })
            : t("favRemoved", { name: playerName }),
        });
      }
    });
  }

  function handleClick() {
    if (favourited) {
      setShowConfirm(true);
    } else {
      doToggle();
    }
  }

  return (
    <>
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="bg-stadium-surface border-stadium-border">
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
        whileTap={{ scale: 0.95 }}
        className={cn(
          "inline-flex items-center gap-2.5 px-4 py-2.5 border font-inter text-sm transition-all cursor-pointer",
          favourited
            ? "bg-lfc-red/10 border-lfc-red/40 text-lfc-red hover:bg-lfc-red/20"
            : "border-stadium-border text-stadium-muted hover:border-lfc-red/40 hover:text-white"
        )}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={favourited ? "filled" : "empty"}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Heart size={16} className={cn(favourited && "fill-lfc-red")} />
          </motion.span>
        </AnimatePresence>
        {favourited ? t("favourited") : t("favourite")}
      </motion.button>
    </>
  );
}
