/**
 * Single source of truth for "which season is it".
 *
 * The season year was previously hardcoded (`2025`) in several files, so every
 * August the whole site silently described the wrong season until someone
 * remembered to edit each copy. Deriving it from the date removes that annual
 * chore, and keeps the label, the season picker and the API metadata in step.
 *
 * A European football season spans two calendar years and is named after the one
 * it starts in: the campaign beginning August 2026 is "2026/27", season year 2026.
 */

/** First month (1-based) of a new season. English football starts in August. */
const SEASON_START_MONTH = 8;

/** How many past seasons the archive offers alongside the current one. */
const ARCHIVE_DEPTH = 3;

/**
 * Season year for a given moment — the calendar year the season kicked off in.
 *
 * August through December belong to the season starting that year; January
 * through July still belong to the season that started the previous year.
 */
export function getCurrentSeasonYear(now: Date = new Date()): number {
  const month = now.getMonth() + 1;
  return month >= SEASON_START_MONTH ? now.getFullYear() : now.getFullYear() - 1;
}

/** Render a season year as its conventional label: 2026 → "2026/27". */
export function formatSeasonLabel(startYear: number): string {
  const endYear = (startYear + 1) % 100;
  return `${startYear}/${endYear.toString().padStart(2, "0")}`;
}

/** The current season's label, e.g. "2026/27". */
export function getCurrentSeasonLabel(now: Date = new Date()): string {
  return formatSeasonLabel(getCurrentSeasonYear(now));
}

/**
 * Selectable seasons, newest first — the current one plus recent history.
 *
 * Used by the season and stats pickers so they gain the new campaign on their
 * own rather than needing the list extended by hand.
 */
export function getSelectableSeasons(
  now: Date = new Date(),
  depth: number = ARCHIVE_DEPTH,
): number[] {
  const current = getCurrentSeasonYear(now);
  return Array.from({ length: depth }, (_, i) => current - i);
}

/** Whether a season year is one the app is willing to render. */
export function isSelectableSeason(
  year: number,
  now: Date = new Date(),
  depth: number = ARCHIVE_DEPTH,
): boolean {
  return getSelectableSeasons(now, depth).includes(year);
}

/**
 * Data-cache lifetime for a finished season. Its fixtures and table no longer
 * change, and Football-Data.org's free tier allows only 10 requests/min, so
 * re-fetching them every few hours just spends quota the live pages need.
 */
export const PAST_SEASON_REVALIDATE_S = 30 * 24 * 3600;

/** Cache lifetime for season-scoped data: `currentTtl` unless the season is over. */
export function seasonRevalidate(
  season: number | undefined,
  currentTtl: number,
  now: Date = new Date(),
): number {
  return season !== undefined && season < getCurrentSeasonYear(now)
    ? PAST_SEASON_REVALIDATE_S
    : currentTtl;
}
