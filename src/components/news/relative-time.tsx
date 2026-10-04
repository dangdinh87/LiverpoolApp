"use client";

import { useSyncExternalStore } from "react";
import { formatRelativeDate } from "@/lib/news-config";

const subscribe = () => () => {};

// false while rendering on the server and during hydration, true afterwards
function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

// "5m ago" depends on Date.now(), so it can't be part of prerendered/ISR HTML:
// the cached text would be stale and the client's first render would differ
// from it (hydration error). Render a placeholder first, fill in after mount.
// The nbsp keeps the line box height so the text doesn't shift the layout in.
export function RelativeTime({ date, lang }: { date: string; lang?: "en" | "vi" }) {
  const hydrated = useHydrated();
  return hydrated ? formatRelativeDate(date, lang) : " ";
}
