/**
 * Club names for tight spaces. The provider's long names ("Manchester City FC",
 * "Wolverhampton Wanderers FC") get clipped on a phone; fans say "Man City" and
 * "Wolves" anyway.
 */

const COMPACT: Record<string, string> = {
  "brighton hove": "Brighton",
  "brighton & hove albion": "Brighton",
  "brighton and hove albion": "Brighton",
  nottingham: "Nott'm Forest",
  "nottingham forest": "Nott'm Forest",
  wolverhampton: "Wolves",
  "wolverhampton wanderers": "Wolves",
  "leeds united": "Leeds",
  "leicester city": "Leicester",
  "ipswich town": "Ipswich",
  "hull city": "Hull",
  "sheffield united": "Sheff Utd",
  "west bromwich albion": "West Brom",
  "manchester city": "Man City",
  "manchester united": "Man United",
  "newcastle united": "Newcastle",
  "tottenham hotspur": "Tottenham",
  "west ham united": "West Ham",
  "aston villa": "Aston Villa",
  "crystal palace": "Crystal Palace",
};

const MAX_COMPACT = 14;

/** "Manchester City FC" -> "Manchester City"; "AFC Bournemouth" -> "Bournemouth". */
export function displayTeamName(name: string): string {
  return name
    .replace(/\s+A?FC$/i, "")
    .replace(/^AFC\s+/i, "")
    .trim();
}

/** Short club name for phones and narrow table columns. */
export function compactTeamName(team: { name: string; shortName?: string }): string {
  const full = displayTeamName(team.name);
  const hit = COMPACT[full.toLowerCase()] ?? (team.shortName ? COMPACT[displayTeamName(team.shortName).toLowerCase()] : undefined);
  if (hit) return hit;
  const short = team.shortName ? displayTeamName(team.shortName) : "";
  const candidate = short && short.length <= full.length ? short : full;
  if (candidate.length <= MAX_COMPACT) return candidate;
  return candidate.split(" ")[0] ?? candidate;
}
