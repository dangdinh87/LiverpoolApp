import { useSyncExternalStore } from "react";

/**
 * "New since your last visit" on /news. Per viewer and per browser only: the
 * time lives in localStorage and never reaches the server.
 *
 * Two keys, because the visit has to be recorded while it is still the one
 * being compared against:
 * - `LAST_VISIT_KEY` (localStorage): when the reader last looked at /news.
 * - `BASELINE_KEY` (sessionStorage): the time that was in LAST_VISIT_KEY when
 *   this tab first read it. Reloading, or opening a story and coming back,
 *   keeps the same divider; a new tab starts from the latest visit.
 * Everything is wrapped in try/catch: storage throws in private windows and
 * when site data is blocked, and the feed must read the same without it.
 */
const LAST_VISIT_KEY = "lfc-news-last-visit";
const BASELINE_KEY = "lfc-news-visit-baseline";
/** How long /news must stay open before the visit counts, so a glance and a bounce do not erase the new stories. */
const COUNT_AFTER_MS = 10_000;

let baseline: number | null | undefined;

function readTime(storage: Storage, key: string): number | null {
  const value = Number(storage.getItem(key));
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** The previous visit, or null on a first visit or when storage is unavailable. */
export function getNewsBaseline(): number | null {
  if (baseline !== undefined) return baseline;
  let found: number | null = null;
  try {
    found = readTime(sessionStorage, BASELINE_KEY);
  } catch {
    // Blocked: fall through to localStorage and keep the value in memory only.
  }
  if (found === null) {
    try {
      found = readTime(localStorage, LAST_VISIT_KEY);
      if (found !== null) sessionStorage.setItem(BASELINE_KEY, String(found));
    } catch {
      // Same: the in-memory copy below still serves this page load.
    }
  }
  baseline = found;
  return found;
}

/** Record that the reader has now seen /news. Reads the baseline first, so it is never overwritten by the visit it describes. */
function recordVisit(now = Date.now()): void {
  getNewsBaseline();
  try {
    localStorage.setItem(LAST_VISIT_KEY, String(now));
  } catch {
    // Nothing to do: next visit simply has no divider.
  }
}

const subscribe = () => () => {};

/**
 * The previous visit's time, or null: always null on the server and on the
 * first client render (so the hydrated markup matches), the stored time after.
 */
export function useNewsBaseline(): number | null {
  return useSyncExternalStore(subscribe, getNewsBaseline, () => null);
}

/**
 * Mark /news as visited after a delay, and when the page is hidden or closed.
 * Not on mount: a glance and a bounce should not count as having caught up,
 * or the stories the reader never saw would lose their divider. Call from an effect.
 */
export function watchNewsVisit(): () => void {
  const timer = window.setTimeout(() => recordVisit(), COUNT_AFTER_MS);
  const onVisibility = () => {
    if (document.visibilityState === "hidden") recordVisit();
  };
  const onPageHide = () => recordVisit();
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onPageHide);
  return () => {
    window.clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", onPageHide);
    // Leaving /news inside the app (no pagehide) counts too.
    recordVisit();
  };
}
