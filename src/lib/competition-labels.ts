/**
 * One name for each competition, wherever it appears (fixture chips, match
 * cards, standings tabs, stats cards). Providers disagree on the spelling —
 * FDO says "EFL Cup", ESPN "League Cup", the stats layer "Carabao Cup" — and the
 * UI used to follow them: "Champions League" on a chip, "UCL" on the card under
 * it and "Cúp C1" on the standings tab.
 *
 * `long` names a competition on its own (chips, tabs, card titles); `short` is
 * the tag that sits beside a round ("UCL · Vòng league").
 */
export type CompetitionKey = "pl" | "ucl" | "fa" | "efl" | "shield";

type Locale = "en" | "vi";

const ALIASES: Record<string, CompetitionKey> = {
  "Premier League": "pl",
  "UEFA Champions League": "ucl",
  "Champions League": "ucl",
  "FA Cup": "fa",
  "EFL Cup": "efl",
  "Carabao Cup": "efl",
  "League Cup": "efl",
  "Community Shield": "shield",
  "FA Community Shield": "shield",
};

const LABELS: Record<CompetitionKey, { long: Record<Locale, string>; short: Record<Locale, string> }> = {
  pl: { long: { en: "Premier League", vi: "Ngoại hạng Anh" }, short: { en: "PL", vi: "PL" } },
  ucl: { long: { en: "Champions League", vi: "Champions League" }, short: { en: "UCL", vi: "UCL" } },
  fa: { long: { en: "FA Cup", vi: "FA Cup" }, short: { en: "FA Cup", vi: "FA Cup" } },
  efl: { long: { en: "EFL Cup", vi: "EFL Cup" }, short: { en: "EFL Cup", vi: "EFL Cup" } },
  shield: { long: { en: "Community Shield", vi: "Community Shield" }, short: { en: "Shield", vi: "Shield" } },
};

/** Display order of the competitions a season can hold. */
export const COMPETITION_ORDER: readonly CompetitionKey[] = ["pl", "ucl", "fa", "efl", "shield"];

/** The canonical key for a provider's competition name, or null for one we do not know. */
export function competitionKey(name: string): CompetitionKey | null {
  return ALIASES[name] ?? null;
}

/** Display name of a competition key in the viewer's language. */
export function competitionName(key: CompetitionKey, locale: string, form: "long" | "short" = "long"): string {
  return LABELS[key][form][locale === "vi" ? "vi" : "en"];
}

/** Display name for a provider's competition string; unknown competitions keep their own name. */
export function competitionLabel(name: string, locale: string, form: "long" | "short" = "long"): string {
  const key = competitionKey(name);
  return key ? competitionName(key, locale, form) : name;
}
