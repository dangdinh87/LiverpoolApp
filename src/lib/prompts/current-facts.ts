import { getAllPlayers, getCoach, POSITION_DISPLAY } from "@/lib/squad-data";
import { getCurrentSeasonLabel } from "@/lib/football/current-season";

/**
 * Ground truth prepended to translation and daily digest prompts.
 *
 * The model's training cutoff stops well before the current season, so without
 * this block it defaults to previous head coaches or refers to 2024/25 as the
 * active campaign. Built from the same data the site renders (`squad.json` and
 * the season helper), so it stays aligned with the squad page.
 */
export function buildCurrentFactsBlock(now: Date = new Date()): string {
  const today = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  const squad = getAllPlayers()
    .map((p) => `#${p.shirtNumber ?? "-"} ${p.name} (${POSITION_DISPLAY[p.position] ?? p.position})`)
    .join("; ");

  return `## Current Facts (authoritative — override anything you remember)
- Today is ${today} (GMT+7).
- Current season: ${getCurrentSeasonLabel(now)}.
- Liverpool head coach: ${getCoach().name}.
- First-team squad on this site: ${squad}.
- Players not in this list are no longer in the first-team squad; say so rather than describing them as current players.
- For anything newer than these facts (results, injuries, transfers), rely strictly on the source text or data supplied in this prompt — never guess or invent details.`;
}
