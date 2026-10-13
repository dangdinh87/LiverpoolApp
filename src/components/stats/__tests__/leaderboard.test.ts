import { describe, expect, it } from "vitest";
import { rankEntries, type LeaderEntry } from "../leaderboard";

const entry = (id: number, value: number): LeaderEntry => ({
  id,
  surname: `P${id}`,
  club: "Club",
  crest: null,
  value,
  isLiverpool: false,
});

describe("rankEntries", () => {
  it("gives players level on a value the rank of the first of them", () => {
    const ranked = rankEntries([entry(1, 5), entry(2, 4), entry(3, 3), entry(4, 3), entry(5, 3), entry(6, 1)]);
    expect(ranked.map((e) => e.rank)).toEqual([1, 2, 3, 3, 3, 6]);
    expect(ranked.map((e) => e.tied)).toEqual([false, false, true, true, true, false]);
  });

  it("ranks a lone leader 1 and not tied", () => {
    expect(rankEntries([entry(1, 9)])).toEqual([{ ...entry(1, 9), rank: 1, tied: false }]);
  });
});
