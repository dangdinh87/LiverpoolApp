"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Thin top progress bar for client navigations (no dependency).
 *
 * Start: a click on an internal link records the page we are leaving.
 * Running: while the current URL still equals that page the bar creeps forward.
 * Done: once the URL changed the bar completes and fades; `animationend`
 * clears it. The phase is derived from state + URL, so no setState-in-effect.
 */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const here = search ? `${pathname}?${search}` : pathname;
  const [from, setFrom] = useState<string | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // No defaultPrevented check: next/link prevents default before this bubbles up.
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const next = url.pathname + url.search;
      const current = window.location.pathname + window.location.search;
      if (next === current) return;
      setFrom(current);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Safety net: a navigation that never lands must not leave the bar crawling.
  useEffect(() => {
    if (from === null || from !== here) return;
    const id = setTimeout(() => setFrom(null), 10_000);
    return () => clearTimeout(id);
  }, [from, here]);

  if (from === null) return null;
  const state = from === here ? "running" : "done";

  return (
    <div
      aria-hidden
      className="nav-progress"
      data-state={state}
      onAnimationEnd={() => state === "done" && setFrom(null)}
    />
  );
}
