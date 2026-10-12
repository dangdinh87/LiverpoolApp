import { describe, expect, it } from "vitest";
import { predictionPoints, summarisePredictions } from "@/lib/fan-predictions/scoring";

describe("predictionPoints", () => {
  it("gives 3 for the exact score, 1 for the right result, 0 otherwise", () => {
    expect(predictionPoints({ home: 2, away: 1 }, { home: 2, away: 1 })).toBe(3);
    expect(predictionPoints({ home: 3, away: 0 }, { home: 2, away: 1 })).toBe(1);
    expect(predictionPoints({ home: 1, away: 1 }, { home: 0, away: 0 })).toBe(1);
    expect(predictionPoints({ home: 0, away: 1 }, { home: 2, away: 1 })).toBe(0);
  });
});

describe("summarisePredictions", () => {
  it("splits outcomes into whole percents that add up to 100", () => {
    const picks = [
      ...Array.from({ length: 3 }, () => ({ home: 2, away: 1 })),
      ...Array.from({ length: 5 }, () => ({ home: 1, away: 1 })),
    ];
    const s = summarisePredictions(picks);
    expect(s.count).toBe(8);
    expect(s.split.home + s.split.draw + s.split.away).toBe(100);
    expect(s.split.away).toBeGreaterThanOrEqual(0);
    expect(s.topScores[0]).toEqual({ home: 1, away: 1, share: 63 });
  });

  it("handles nobody having predicted yet", () => {
    expect(summarisePredictions([])).toEqual({ count: 0, split: { home: 0, draw: 0, away: 0 }, topScores: [] });
  });
});
