/**
 * Chart palette — single source of truth for series colours in the stats pages.
 *
 * The charts previously used Tailwind's stock status hues (#22c55e green,
 * #f59e0b amber, #ef4444 red) straight out of the box. Three problems: it reads
 * as a generic analytics dashboard rather than this site, #ef4444 sat next to
 * the club's own #C8102E so red meant two different things on one screen, and
 * the trio was never checked for colour-vision separation.
 *
 * OUTCOME_SERIES is validated against the Dark Stadium chart surface (#1A1A1A)
 * and passes all six checks — OKLCH lightness band, chroma floor, CVD adjacent
 * separation (protan/deutan/tritan), normal-vision separation, and contrast.
 * Re-run the validator before changing any value here.
 *
 * Brand colours stay reserved: #C8102E is Liverpool, #F6EB61 is the gold accent.
 * Neither is spent on an arbitrary series slot.
 */

/** Win / draw / loss. Always shipped with a legend — never colour alone. */
export const OUTCOME_SERIES = {
  win: "#A8901F",
  draw: "#B4552E",
  loss: "#1C74C4",
} as const;

/** Two-way splits (home vs away, for vs against) use the club's own pair. */
export const BRAND_SERIES = {
  primary: "#C8102E",
  secondary: "#F6EB61",
} as const;

/** Recessive chrome: axes, grid lines, tick labels. */
export const CHART_INK = {
  axis: "#A0A0A0",
  grid: "#2A2A2A",
  surface: "#1A1A1A",
} as const;
