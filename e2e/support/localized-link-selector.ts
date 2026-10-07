/**
 * CSS selector for an internal link to `path`, in either locale.
 *
 * Links are locale-aware, so the same destination is "/player/x" on Vietnamese
 * pages and "/en/player/x" on English ones. A bare `^='/player/'` prefix match
 * silently stopped matching once hrefs started carrying the prefix, which read
 * as "the squad grid renders no players" rather than as a selector problem.
 */
export function anchorTo(path: string): string {
  return `a[href^='${path}'], a[href^='/en${path}']`;
}
