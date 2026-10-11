"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Fixture, LiveMatchSnapshot } from "@/lib/types/football";

const LIVE_STATUSES = new Set(["1H", "HT", "2H", "ET", "P", "BT", "LIVE"]);

/**
 * One request a minute is enough: the match clock ticks on the client between
 * polls (see LiveClock), and the server caches ESPN for 30s anyway.
 */
const POLL_MS = 60_000;
/** Around kick-off a cached page may still say "not started": watch from 5 min before to 3 h after. */
const WATCH_BEFORE_MS = 5 * 60_000;
const WATCH_AFTER_MS = 3 * 60 * 60_000;
/** setTimeout overflows above ~24.8 days; a kick-off further out needs no timer yet. */
const MAX_TIMER_MS = 2_147_483_647;

type LiveResponse = { fixture: Fixture | null; live: LiveMatchSnapshot | null };

async function fetchLive(): Promise<LiveResponse> {
  const res = await fetch("/api/live-fixture");
  if (!res.ok) throw new Error(`live-fixture ${res.status}`);
  return res.json();
}

/** True from 5 min before kick-off to 3 h after, using one timer per edge rather than a ticking clock. */
function useNearKickOff(kickOffIso: string, watch: boolean): boolean {
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (!watch) return;
    const kickOff = new Date(kickOffIso).getTime();
    const from = kickOff - WATCH_BEFORE_MS - Date.now();
    const to = kickOff + WATCH_AFTER_MS - Date.now();
    if (to <= 0 || from > MAX_TIMER_MS) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    // The window may already be open on mount, and the clock can only be read here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (from <= 0) setNear(true);
    else timers.push(setTimeout(() => setNear(true), from));
    if (to <= MAX_TIMER_MS) timers.push(setTimeout(() => setNear(false), to));
    return () => timers.forEach(clearTimeout);
  }, [kickOffIso, watch]);
  return near;
}

/** Whether the observed element is on screen; polling pauses while the card is scrolled away. */
function useOnScreen(): [boolean, (node: Element | null) => void] {
  const [node, setNode] = useState<Element | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!node) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    io.observe(node);
    return () => io.disconnect();
  }, [node]);
  return [visible, useCallback((n: Element | null) => setNode(n), [])];
}

export interface LiveMatchState {
  fixture: Fixture;
  /** ESPN clock, goals, cards and stats; null until the first poll answers (or when ESPN has nothing). */
  live: LiveMatchSnapshot | null;
  /** The match was seen live on this page and the server now says it is over. */
  ended: boolean;
  /** When the last poll answered (client clock); null before the first one. */
  updatedAt: number | null;
  /** Attach to the card: polling only runs while it is on screen. */
  ref: (node: Element | null) => void;
}

/**
 * Live score for a match the page rendered as live — or, with `watchKickOff`,
 * the next match once kick-off is near and the cached page may not know yet.
 *
 * Every card shares one query, so a page asks once a minute however many cards
 * it shows. It only asks while a card is on screen and the tab is visible, and
 * stops for good once a match seen live is over.
 */
export function useLiveMatch(initial: Fixture, watchKickOff = false): LiveMatchState {
  const id = initial.fixture.id;
  const initiallyLive = LIVE_STATUSES.has(initial.fixture.status.short);
  const nearKickOff = useNearKickOff(initial.fixture.date, watchKickOff && !initiallyLive);
  const [onScreen, ref] = useOnScreen();
  // The last answer that was about this match: kept on screen after full time.
  const [last, setLast] = useState<{ fixture: Fixture; live: LiveMatchSnapshot | null } | null>(null);
  const [ended, setEnded] = useState(false);

  const { data, dataUpdatedAt } = useQuery({
    queryKey: ["live-fixture"],
    queryFn: fetchLive,
    enabled: (initiallyLive || nearKickOff) && onScreen && !ended,
    refetchInterval: POLL_MS,
    staleTime: POLL_MS / 2,
    // A tab coming back after a while should not wait up to a minute for the score.
    refetchOnWindowFocus: true,
  });

  // Derived state, adjusted while rendering (React's documented pattern):
  // keep the newest answer about this match, and mark the match over once a
  // match seen live drops out of the answers.
  const mine = data?.fixture?.fixture.id === id ? data.fixture : null;
  if (mine && last?.fixture !== mine) setLast({ fixture: mine, live: data?.live ?? null });
  if (data && !mine && (last || initiallyLive) && !ended) setEnded(true);

  return {
    fixture: last?.fixture ?? initial,
    live: last?.live ?? null,
    ended,
    updatedAt: dataUpdatedAt || null,
    ref,
  };
}
