"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";

/**
 * Client-side hook that fetches the current user's favourite player IDs.
 * Returns a Set of player IDs and a toggle function.
 */
export function useFavourites() {
  const [ids, setIds] = useState<Set<number>>(new Set());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setIsLoggedIn(true);

      const { data } = await supabase
        .from("favourite_players")
        .select("player_id")
        .eq("user_id", user.id);

      if (data) {
        setIds(new Set(data.map((r) => r.player_id)));
      }
      setLoading(false);
    }

    load();
  }, []);

  const toggle = useCallback((playerId: number, added: boolean) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (added) next.add(playerId);
      else next.delete(playerId);
      return next;
    });
  }, []);

  return { ids, isLoggedIn, loading, toggle };
}
