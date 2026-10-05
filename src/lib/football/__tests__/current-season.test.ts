import { describe, it, expect } from "vitest";
import {
  getCurrentSeasonYear,
  formatSeasonLabel,
  getCurrentSeasonLabel,
  getSelectableSeasons,
  isSelectableSeason,
  PAST_SEASON_REVALIDATE_S,
  seasonRevalidate,
} from "@/lib/football/current-season";

describe("getCurrentSeasonYear", () => {
  it("treats August as the start of the new season", () => {
    expect(getCurrentSeasonYear(new Date("2026-08-01T00:00:00Z"))).toBe(2026);
  });

  it("keeps July in the season that started the previous year", () => {
    expect(getCurrentSeasonYear(new Date("2026-07-31T00:00:00Z"))).toBe(2025);
  });

  it("keeps mid-season January with the starting year", () => {
    expect(getCurrentSeasonYear(new Date("2027-01-15T00:00:00Z"))).toBe(2026);
  });

  it("reports the 2026/27 season in September 2026", () => {
    expect(getCurrentSeasonYear(new Date("2026-09-10T00:00:00Z"))).toBe(2026);
  });
});

describe("formatSeasonLabel", () => {
  it("renders the conventional two-year label", () => {
    expect(formatSeasonLabel(2026)).toBe("2026/27");
  });

  it("pads a century rollover to two digits", () => {
    expect(formatSeasonLabel(2099)).toBe("2099/00");
  });

  it("derives the current label from the date", () => {
    expect(getCurrentSeasonLabel(new Date("2026-09-10T00:00:00Z"))).toBe("2026/27");
  });
});

describe("getSelectableSeasons", () => {
  it("lists the current season first, then recent history", () => {
    expect(getSelectableSeasons(new Date("2026-09-10T00:00:00Z"))).toEqual([
      2026, 2025, 2024,
    ]);
  });

  it("honours a custom depth", () => {
    expect(getSelectableSeasons(new Date("2026-09-10T00:00:00Z"), 2)).toEqual([
      2026, 2025,
    ]);
  });

  it("accepts the current season and rejects one outside the window", () => {
    const now = new Date("2026-09-10T00:00:00Z");
    expect(isSelectableSeason(2026, now)).toBe(true);
    expect(isSelectableSeason(2019, now)).toBe(false);
  });
});

describe("seasonRevalidate", () => {
  const now = new Date("2026-10-01T00:00:00Z"); // season 2026/27

  it("keeps the given TTL for the current season or an unspecified one", () => {
    expect(seasonRevalidate(undefined, 300, now)).toBe(300);
    expect(seasonRevalidate(2026, 3600, now)).toBe(3600);
  });

  it("caches finished seasons for 30 days", () => {
    expect(seasonRevalidate(2025, 3600, now)).toBe(PAST_SEASON_REVALIDATE_S);
    expect(seasonRevalidate(2022, 21600, now)).toBe(PAST_SEASON_REVALIDATE_S);
  });
});
