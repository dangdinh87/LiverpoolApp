/**
 * Cache tags for the football data layer.
 *
 * Deliberately its own module with no imports. The tag first lived next to the
 * cached fixture list, but that module imports `./index` — and `./index`
 * re-exports `fpl-stats`, which wanted the tag too. That closed a cycle
 * (index → fpl-stats → cached-fixtures → index). TypeScript permits cycles, so
 * nothing failed the build; at runtime the loser of the initialisation race
 * reads the constant as `undefined`, which would have produced an untagged
 * cache entry rather than an error. A leaf module cannot do that.
 */

/**
 * Everything derived from the match-data providers.
 *
 * Nothing busts it on a schedule yet — a result only changes when a match is
 * played and there is no post-match job. It exists so these caches *can* be
 * invalidated from one place when there is, and so their windows can be
 * generous without the data becoming unreachable.
 */
export const FOOTBALL_CACHE_TAG = "football";
