/** Locales that appear as a URL prefix. Mirrors src/i18n/routing.ts. */
const PREFIXED_LOCALES = ["vi"];

/**
 * CSS selector for an internal link to `path`, in any locale.
 *
 * Links are locale-aware, so the same destination is "/player/x" for the
 * default locale and "/vi/player/x" for a prefixed one. A bare prefix match
 * silently stopped matching when hrefs gained the prefix, which read as "the
 * squad grid renders no players" rather than as a selector problem.
 */
export function anchorTo(path: string): string {
  return [
    `a[href^='${path}']`,
    ...PREFIXED_LOCALES.map((l) => `a[href^='/${l}${path}']`),
  ].join(", ");
}
