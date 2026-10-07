import { describe, expect, it } from "vitest";
import {
  getAllPlayers,
  getPlayerBio,
  getPlayerBySlug,
  normalizeSquad,
  type SquadData,
} from "@/lib/squad-data";

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

describe("getPlayerBio", () => {
  it("returns no markup or entities for any player, in either locale", () => {
    // English bios ship as HTML fragments; callers render the string as text, so
    // any tag that survives is printed to the reader verbatim.
    for (const player of getAllPlayers()) {
      for (const locale of ["en", "vi"]) {
        const bio = getPlayerBio(player.slug, locale);
        expect(bio, `${player.slug} (${locale}) markup`).not.toMatch(/<[a-z/]/i);
        expect(bio, `${player.slug} (${locale}) entity`).not.toMatch(/&[a-z#0-9]+;/i);
      }
    }
  });

  it("keeps paragraph breaks so the page can split on them", () => {
    const bio = getPlayerBio("freddie-woodman", "en");
    expect(bio.split(/\n{2,}/).length).toBeGreaterThan(1);
  });

  it("does not leave a stray closing tag at the start of a paragraph", () => {
    // The reported symptom: "</p><p>Woodman left St." rendered as body copy.
    const bio = getPlayerBio("freddie-woodman", "en");
    for (const paragraph of bio.split(/\n{2,}/)) {
      expect(paragraph.trim()).not.toMatch(/^<\//);
    }
  });

  it("leaves a plain-text Vietnamese bio untouched apart from trimming", () => {
    const bio = getPlayerBio("alisson-becker", "vi");
    expect(bio.startsWith("Alisson Becker")).toBe(true);
  });

  it("falls back to the English bio when a locale has none, still as plain text", () => {
    const missing = getAllPlayers().find((p) => getPlayerBio(p.slug, "vi") === getPlayerBio(p.slug, "en"));
    if (missing) expect(getPlayerBio(missing.slug, "vi")).not.toMatch(/<[a-z/]/i);
  });
});
