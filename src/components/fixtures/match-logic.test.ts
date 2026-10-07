import { describe, expect, it } from "vitest";
import { matchCentreHref } from "./match-centre-links";
import { parseRound, roundLabel } from "./round-label";
import { compactTeamName, displayTeamName } from "./team-name";
import { airsOnFptPlay } from "./where-to-watch";

describe("parseRound", () => {
  it("reads matchdays in every shape the providers use", () => {
    expect(parseRound("Matchday 6")).toEqual({ kind: "matchday", n: 6 });
    expect(parseRound("Regular Season - 12")).toEqual({ kind: "matchday", n: 12 });
    expect(parseRound("LEAGUE_STAGE 3")).toEqual({ kind: "matchday", n: 3 });
  });
  it("maps knockout stages, enum or free text", () => {
    expect(parseRound("LAST_16")).toEqual({ kind: "r16" });
    expect(parseRound("Round of 32")).toEqual({ kind: "r32" });
    expect(parseRound("QUARTER_FINALS")).toEqual({ kind: "qf" });
    expect(parseRound("Semi-finals")).toEqual({ kind: "sf" });
    expect(parseRound("FINAL")).toEqual({ kind: "final" });
    expect(parseRound("PLAYOFFS")).toEqual({ kind: "playoff" });
    expect(parseRound("LEAGUE_STAGE")).toEqual({ kind: "leaguePhase" });
  });
  it("numbers the early cup rounds", () => {
    expect(parseRound("Third Round")).toEqual({ kind: "matchday", n: 3 });
    expect(parseRound("Fourth Round Proper")).toEqual({ kind: "matchday", n: 4 });
    expect(parseRound("5th Round")).toEqual({ kind: "matchday", n: 5 });
  });
  it("drops empty and meaningless rounds, keeps unknown text as is", () => {
    expect(parseRound("")).toBeNull();
    expect(parseRound(undefined)).toBeNull();
    expect(parseRound("Regular Season")).toBeNull();
    expect(parseRound("Preliminary Phase")).toEqual({ kind: "raw", value: "Preliminary Phase" });
  });
});

describe("roundLabel", () => {
  const t = (key: string, v?: Record<string, string | number>) => (v ? `${key}:${v.n}` : key);
  it("goes through the translator", () => {
    expect(roundLabel(t, "Matchday 6")).toBe("matchday:6");
    expect(roundLabel(t, "QUARTER_FINALS")).toBe("qf");
    expect(roundLabel(t, "Regular Season")).toBe("");
    expect(roundLabel(t, "Preliminary Phase")).toBe("Preliminary Phase");
  });
});

describe("team names", () => {
  it("strips club suffixes", () => {
    expect(displayTeamName("Manchester City FC")).toBe("Manchester City");
    expect(displayTeamName("AFC Bournemouth")).toBe("Bournemouth");
    expect(displayTeamName("FC Barcelona")).toBe("FC Barcelona");
  });
  it("shortens long names for phones", () => {
    expect(compactTeamName({ name: "Manchester City FC", shortName: "Man City" })).toBe("Man City");
    expect(compactTeamName({ name: "Nottingham Forest FC", shortName: "Nottingham" })).toBe("Nott'm Forest");
    expect(compactTeamName({ name: "Brighton & Hove Albion FC", shortName: "Brighton Hove" })).toBe("Brighton");
    expect(compactTeamName({ name: "Wolverhampton Wanderers FC" })).toBe("Wolves");
    expect(compactTeamName({ name: "Paris Saint-Germain FC", shortName: "PSG" })).toBe("PSG");
    expect(compactTeamName({ name: "Liverpool FC", shortName: "Liverpool" })).toBe("Liverpool");
  });
  it("falls back to the first word when nothing fits", () => {
    expect(compactTeamName({ name: "Borussia Mönchengladbach 1900" })).toBe("Borussia");
  });
});

describe("matchCentreHref", () => {
  it("uses the canonical routes for the current season", () => {
    expect(matchCentreHref("fixtures")).toBe("/fixtures");
    expect(matchCentreHref("results")).toBe("/fixtures?view=results");
    expect(matchCentreHref("standings")).toBe("/standings");
    expect(matchCentreHref("stats")).toBe("/stats");
  });
  it("keeps an archive season in the URL", () => {
    expect(matchCentreHref("fixtures", 2025)).toBe("/season?season=2025");
    expect(matchCentreHref("results", 2025)).toBe("/season?season=2025&view=results");
    expect(matchCentreHref("standings", 2025)).toBe("/season?season=2025&tab=standings");
    expect(matchCentreHref("stats", 2025)).toBe("/stats?season=2025");
  });
});

describe("airsOnFptPlay", () => {
  it("is Premier League only", () => {
    expect(airsOnFptPlay("Premier League", "vi")).toBe(true);
    expect(airsOnFptPlay("UEFA Champions League", "vi")).toBe(false);
    expect(airsOnFptPlay(undefined, "vi")).toBe(false);
  });

  it("is hidden outside Vietnam until a per-country table exists", () => {
    expect(airsOnFptPlay("Premier League", "en")).toBe(false);
  });
});
