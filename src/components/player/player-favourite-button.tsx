"use client";

import Link from "next/link";
import { useState, useEffect, useTransition } from "react";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { hasSupabaseSession, loadSupabaseClient } from "@/lib/supabase-lazy";
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

const BTN =
  "inline-flex min-h-11 items-center gap-2.5 border px-4 text-sm font-medium transition-colors duration-[var(--dur-base)] ease-[var(--ease-out)]";

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
    async function init() {
      // No session cookie means a guest; don't load the Supabase client for that.
      if (!hasSupabaseSession()) {
        setState("guest");
        return;
      }
      const supabase = await loadSupabaseClient();
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
      <div className={cn(BTN, "border-[var(--line-strong)] text-stadium-muted")} aria-busy="true">
        <Heart size={18} aria-hidden />
        {t("favourite")}
      </div>
    );
  }

  if (state === "guest") {
    return (
      <Link
        href="/auth/login"
        className={cn(BTN, "border-[var(--line-strong)] text-stadium-muted hover:border-white/40 hover:text-white")}
        title={t("loginToFav")}
      >
        <Heart size={18} aria-hidden />
        {t("favourite")}
      </Link>
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

      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-pressed={favourited}
        className={cn(
          BTN,
          "cursor-pointer disabled:opacity-60",
          favourited
            ? "border-lfc-red/60 bg-lfc-red/15 text-white hover:bg-lfc-red/25"
            : "border-[var(--line-strong)] text-stadium-muted hover:border-white/40 hover:text-white"
        )}
      >
        <Heart size={18} aria-hidden className={cn(favourited && "fill-lfc-red text-lfc-red")} />
        {favourited ? t("favourited") : t("favourite")}
      </button>
    </>
  );
}
