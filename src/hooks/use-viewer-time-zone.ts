"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** The browser's IANA zone, or null where Intl cannot say. */
const readBrowserZone = (): string | null => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
};

/**
 * The viewer's own time zone, falling back to `fallback` on the server and
 * during hydration. `useSyncExternalStore` renders the server snapshot first,
 * so the markup matches the server's and React then re-renders with the real
 * zone — no hydration mismatch, no flash of a wrong time after that swap.
 */
export function useViewerTimeZone(fallback: string): string {
  const zone = useSyncExternalStore(subscribe, readBrowserZone, () => null);
  return zone ?? fallback;
}
