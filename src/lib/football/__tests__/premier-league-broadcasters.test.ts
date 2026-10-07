import { describe, expect, it } from "vitest";
import {
  findBroadcaster,
  KNOWN_TIME_ZONES,
} from "@/lib/football/premier-league-broadcasters";

describe("findBroadcaster", () => {
  it("answers for a viewer outside Vietnam", () => {
    // The whole point of the table: the line used to be Vietnam-only, so a
    // reader in Jakarta or London was told nothing at all.
    expect(findBroadcaster("Premier League", "Asia/Jakarta")).toEqual({
      country: "Indonesia",
      service: "Vidio",
    });
    expect(findBroadcaster("Premier League", "Europe/London")?.country).toBe("the UK");
  });

  it("still answers for Vietnam", () => {
    expect(findBroadcaster("Premier League", "Asia/Ho_Chi_Minh")).toEqual({
      country: "Vietnam",
      service: "FPT Play",
    });
  });

  it("says nothing for a competition whose rights it does not track", () => {
    // Cup rights are split differently in most markets; a confident wrong
    // answer is worse than none.
    expect(findBroadcaster("UEFA Champions League", "Europe/London")).toBeNull();
    expect(findBroadcaster("FA Cup", "Asia/Ho_Chi_Minh")).toBeNull();
  });

  it("says nothing for a country it does not know", () => {
    expect(findBroadcaster("Premier League", "Antarctica/Troll")).toBeNull();
  });

  it("says nothing when the browser gave no time zone", () => {
    expect(findBroadcaster("Premier League", null)).toBeNull();
    expect(findBroadcaster("Premier League", "")).toBeNull();
  });

  it("lists only valid IANA zones, so a typo cannot silently never match", () => {
    for (const zone of KNOWN_TIME_ZONES) {
      expect(
        () => new Intl.DateTimeFormat("en", { timeZone: zone }),
        `${zone} is not a zone Intl recognises`,
      ).not.toThrow();
    }
  });

  it("gives every entry both a country and a service", () => {
    for (const zone of KNOWN_TIME_ZONES) {
      const b = findBroadcaster("Premier League", zone);
      expect(b?.country, zone).toBeTruthy();
      expect(b?.service, zone).toBeTruthy();
    }
  });
});
