"use client";

import { useSyncExternalStore } from "react";

/** `useSyncExternalStore` needs a subscribe function; the URL is read once, not watched. */
const subscribeToNothing = () => () => {};

/**
 * A query-string value, read only after hydration.
 *
 * Returns `null` on the server and on the first client render, so both agree.
 *
 * Reading a filter from `searchParams` in the page component instead opts the
 * whole route out of prerendering: Next has to render it per request, which
 * means a visitor in London waits for a round trip to the one region the
 * function runs in. Where the parameter only picks which slice of already
 * fetched data to show — `/fixtures?view=results`, `/news?source=bbc` — reading
 * it here keeps the page static and CDN-cached everywhere, with the full list
 * still in the HTML for search engines.
 *
 * Pair it with a `useState` the UI controls and `history.replaceState`, so a
 * shared link lands on the right slice and clicking around keeps the URL true.
 */
export function useUrlSearchParam(name: string): string | null {
  return useSyncExternalStore(
    subscribeToNothing,
    () => new URLSearchParams(window.location.search).get(name),
    () => null,
  );
}
