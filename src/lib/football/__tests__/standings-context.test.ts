import { describe, expect, it } from "vitest";
import type { Standing } from "@/lib/types/football";
import { standingsContext } from "@/lib/football/standings-context";

const POINTS = [18, 15, 13, 10, 10, 10, 9, 9, 9, 9, 8, 7, 6, 5, 5, 4, 3, 3, 3, 2];
const table = POINTS.map((points, i) => ({ rank: i + 1, points, team: { id: i === 8 ? 40 : 100 + i, name: `Team ${i + 1}`, logo: "" } }) as Standing);

describe("standingsContext", () => {
  it("measures Liverpool against the top, the top four and the drop", () => {
    const c = standingsContext(table, 40, 103);
    expect(c).toMatchObject({ rank: 9, points: 9, behindLeader: 9, topFour: { inside: false, gap: 1 }, aboveDrop: 6 });
    expect(c?.opponent).toEqual({ name: "Team 4", rank: 4, points: 10 });
  });

  it("reports the cushion over fifth when inside the top four", () => {
    const c = standingsContext(table, 101);
    expect(c?.topFour).toEqual({ inside: true, gap: 5 });
    expect(c?.behindLeader).toBe(3);
  });

  it("returns null without a Liverpool row", () => {
    expect(standingsContext([], 40)).toBeNull();
  });
});
