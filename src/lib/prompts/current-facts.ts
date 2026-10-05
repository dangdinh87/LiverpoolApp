import { getAllPlayers, getCoach, POSITION_DISPLAY } from "@/lib/squad-data";
import { getCurrentSeasonLabel } from "@/lib/football/current-season";

/**
 * Ground truth appended to the chat system prompt on every request.
 *
 * The model's own knowledge stops well before the current season, so without
 * this it answered "who is the manager?" with the previous head coach and
 * talked about 2024/25 as the current campaign — even when web search was on.
 * Built from the same data the site renders (squad.json, the season helper),
 * so it stays as current as the squad page.
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
- Today is ${today} (Vietnam time).
- Current season: ${getCurrentSeasonLabel(now)}.
- Liverpool head coach: ${getCoach().name}.
- First-team squad on this site: ${squad}.
- Players not in this list are no longer in the first-team squad; say so rather than describing them as current players.
- For anything newer than these facts (results, injuries, transfers), rely on the web search results when they are provided, or say you are not sure.`;
}
