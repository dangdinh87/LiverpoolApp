/**
 * Round names arrive in whatever shape the data provider uses: "Matchday 6"
 * (Football-Data.org), enum-style stages ("LAST_16", "LEAGUE_STAGE") or free
 * text from ESPN. This turns them into a key that maps to a translated label,
 * so the Vietnamese page does not print "MATCHDAY 6".
 */

export type RoundInfo =
  | { kind: "matchday"; n: number }
  | { kind: "r32" | "r16" | "qf" | "sf" | "final" | "third" | "playoff" | "leaguePhase" | "group" }
  | { kind: "raw"; value: string };

const ORDINALS: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6 };

/** Returns null when the provider's round says nothing useful ("Regular Season"). */
export function parseRound(round: string | null | undefined): RoundInfo | null {
  const raw = (round ?? "").trim();
  if (!raw) return null;

  const numbered = raw.replace(/_/g, " ").match(/^(?:matchday|regular season|league (?:stage|phase))\s*[-:]?\s*(\d+)$/i);
  if (numbered) return { kind: "matchday", n: Number(numbered[1]) };

  const norm = raw.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (norm === "regular season") return null;
  // Cup rounds: "Third Round", "Fourth Round Proper" -> "Vòng 3", "Vòng 4"
  const ordinal = norm.match(/^(first|second|third|fourth|fifth|sixth|\d+(?:st|nd|rd|th)) round(?: proper| qualifying)?$/);
  if (ordinal) {
    const n = ORDINALS[ordinal[1]] ?? Number.parseInt(ordinal[1], 10);
    if (n > 0) return { kind: "matchday", n };
  }
  if (/^(last 32|round of 32)$/.test(norm)) return { kind: "r32" };
  if (/^(last 16|round of 16)$/.test(norm)) return { kind: "r16" };
  if (/^quarter ?finals?$/.test(norm)) return { kind: "qf" };
  if (/^semi ?finals?$/.test(norm)) return { kind: "sf" };
  if (norm === "final") return { kind: "final" };
  if (/^third place/.test(norm)) return { kind: "third" };
  if (/play ?offs?/.test(norm)) return { kind: "playoff" };
  if (/^league (stage|phase)$/.test(norm)) return { kind: "leaguePhase" };
  if (norm === "group stage") return { kind: "group" };
  return { kind: "raw", value: raw };
}

type Translate = (key: string, values?: Record<string, string | number>) => string;

/** Display label for a round, or "" when there is nothing worth showing. `t` is `useTranslations("Match.round")`. */
export function roundLabel(t: Translate, round: string | null | undefined): string {
  const info = parseRound(round);
  if (!info) return "";
  if (info.kind === "raw") return info.value;
  if (info.kind === "matchday") return t("matchday", { n: info.n });
  return t(info.kind);
}
