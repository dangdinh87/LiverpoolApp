/**
 * One colour language for W / D / L markers (home form strip, H2H, season form
 * timeline). Every pair passes WCAG AA for small text on its own fill:
 * white on emerald-700 5.4:1, black on amber-400 11:1, white on red-600 4.8:1.
 * (The older green-500 / emerald-600 / red-500 fills with white text were 3.6–3.8:1.)
 */
export const RESULT_BADGE = {
  W: "bg-emerald-700 text-white",
  D: "bg-amber-400 text-black",
  L: "bg-red-600 text-white",
} as const;

/** Dot/legend swatches (no text on top), same hues as {@link RESULT_BADGE}. */
export const RESULT_SWATCH = {
  W: "bg-emerald-600",
  D: "bg-amber-400",
  L: "bg-red-600",
} as const;
