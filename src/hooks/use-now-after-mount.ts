"use client";

import { useEffect, useState } from "react";

/**
 * The current time, but only once the component has mounted.
 *
 * Returns `null` on the server and on the first client render, so both agree;
 * time-derived UI should render a neutral placeholder until a value arrives.
 *
 * Reading the clock during render instead makes the server and the browser
 * disagree whenever a boundary falls between them — a second for a countdown, a
 * minute for "starts soon". React then discards the server HTML for that tree
 * (hydration error #418), which showed up here as an intermittent, load-
 * dependent failure that was invisible in a quiet dev session.
 *
 * @param intervalMs How often to refresh. Match it to the smallest unit shown:
 *                   1000 for seconds, 60000 for minutes.
 */
export function useNowAfterMount(intervalMs: number = 60_000): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // Setting state straight away is the point: the first paint must match the
    // server's, and the real time can only be read once we are on the client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
