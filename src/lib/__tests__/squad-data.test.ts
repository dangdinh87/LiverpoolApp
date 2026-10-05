import { describe, expect, it } from "vitest";
import { getAllPlayers, getPlayerBySlug, normalizeSquad, type SquadData } from "@/lib/squad-data";

describe("squad data", () => {
  it("gives every player an honors array (recent signings have no key in squad.json)", () => {
    const players = getAllPlayers();
    expect(players.length).toBeGreaterThan(0);
    for (const p of players) {
      expect(Array.isArray(p.honors), `${p.slug} honors`).toBe(true);
    }
  });

  it("does not crash the player page's honors check for a player without honours data", () => {
    // Giorgi Mamardashvili joined in 2025 and has no `honors` key in the feed.
    const p = getPlayerBySlug("giorgi-mamardashvili");
    expect(p).not.toBeNull();
    expect(p!.honors.length).toBeGreaterThanOrEqual(0);
  });

  it("normalizeSquad fills a missing honors key and keeps existing ones", () => {
    const raw = {
      players: [{ slug: "a" }, { slug: "b", honors: ["League (2020)"] }],
    } as unknown as SquadData;
    const out = normalizeSquad(raw);
    expect(out.players[0].honors).toEqual([]);
    expect(out.players[1].honors).toEqual(["League (2020)"]);
  });
});
