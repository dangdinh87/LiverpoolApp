import type { MatchReviewFacts } from "@/lib/site-articles/types";

/** A real-shaped match report fact set, for validator tests. */
export const REVIEW_FACTS: MatchReviewFacts = {
  kind: "review",
  competition: "Premier League",
  competitionAliases: ["Ngoại hạng Anh", "EPL"],
  round: "Matchday 6",
  venue: "Anfield",
  kickOff: "2026-10-11T15:30:00Z",
  home: { name: "Liverpool", score: 2 },
  away: { name: "Manchester City", score: 1 },
  liverpoolSide: "home",
  result: "win",
  halfTime: { home: 1, away: 1 },
  goals: [
    { minute: 23, scorer: "Mohamed Salah", assist: "Florian Wirtz", team: "Liverpool", kind: "goal" },
    { minute: 41, scorer: "Erling Haaland", assist: null, team: "Manchester City", kind: "goal" },
    { minute: 78, scorer: "Cody Gakpo", assist: null, team: "Liverpool", kind: "goal" },
  ],
  cards: [{ minute: 66, player: "Ryan Gravenberch", team: "Liverpool", colour: "yellow" }],
  formation: "4-3-3",
  coach: "Arne Slot",
  substitutes: ["Federico Chiesa"],
  starters: ["Alisson Becker", "Virgil van Dijk", "Mohamed Salah", "Cody Gakpo", "Ryan Gravenberch"],
  stats: { possession: [54, 46], shots: [14, 11], onTarget: [6, 4], corners: [7, 5] },
  table: { position: 2, points: 13, played: 6 },
};
