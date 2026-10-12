/**
 * Points for a score prediction: 3 for the exact score, 1 for the right result
 * (win, draw or loss), 0 otherwise. The classic office-sweepstake rule, simple
 * enough to explain in one line on the page.
 */

export interface Score {
  home: number;
  away: number;
}

export const EXACT_POINTS = 3;
export const RESULT_POINTS = 1;

const outcome = (s: Score) => Math.sign(s.home - s.away);

export function predictionPoints(prediction: Score, result: Score): number {
  if (prediction.home === result.home && prediction.away === result.away) return EXACT_POINTS;
  return outcome(prediction) === outcome(result) ? RESULT_POINTS : 0;
}

export interface CommunityPrediction {
  count: number;
  /** Shares of home win / draw / away win, in whole percent summing to 100 (0s when count is 0). */
  split: { home: number; draw: number; away: number };
  /** Most picked exact scores, most popular first. */
  topScores: { home: number; away: number; share: number }[];
}

/**
 * Whole percents that always add up to 100 (largest remainder): plain rounding
 * gives 38 + 63 for 3/8 and 5/8, and a -1% third share.
 */
function wholePercents(tally: { home: number; draw: number; away: number }, count: number) {
  const keys = ["home", "draw", "away"] as const;
  const exact = keys.map((k) => (tally[k] / count) * 100);
  const floors = exact.map(Math.floor);
  let left = 100 - floors.reduce((a, b) => a + b, 0);
  const order = [0, 1, 2].sort((a, b) => exact[b] - floors[b] - (exact[a] - floors[a]));
  for (const i of order) if (left-- > 0) floors[i] += 1;
  return { home: floors[0], draw: floors[1], away: floors[2] };
}

/** What everyone predicted for one match. */
export function summarisePredictions(predictions: Score[], top = 3): CommunityPrediction {
  const count = predictions.length;
  if (count === 0) return { count, split: { home: 0, draw: 0, away: 0 }, topScores: [] };

  const tally = { home: 0, draw: 0, away: 0 };
  const byScore = new Map<string, { home: number; away: number; n: number }>();
  for (const p of predictions) {
    const o = outcome(p);
    if (o > 0) tally.home += 1;
    else if (o < 0) tally.away += 1;
    else tally.draw += 1;
    const key = `${p.home}-${p.away}`;
    const entry = byScore.get(key) ?? { home: p.home, away: p.away, n: 0 };
    entry.n += 1;
    byScore.set(key, entry);
  }

  const split = wholePercents(tally, count);

  const topScores = [...byScore.values()]
    .sort((a, b) => b.n - a.n || a.home + a.away - (b.home + b.away))
    .slice(0, top)
    .map((s) => ({ home: s.home, away: s.away, share: Math.round((s.n / count) * 100) }));

  return { count, split, topScores };
}
