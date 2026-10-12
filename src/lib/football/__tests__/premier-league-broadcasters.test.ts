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

  it("lists each time zone once, so no market silently shadows another", () => {
    // The table is built from a per-market list, each naming its own zones, so
    // the same zone appearing under two countries is a typo away. Object
    // construction would keep whichever came last, without complaining.
    const seen = new Set<string>();
    const repeated = KNOWN_TIME_ZONES.filter((z) => (seen.has(z) ? true : (seen.add(z), false)));
    expect(repeated, `listed more than once: ${repeated.join(", ")}`).toEqual([]);
  });

  it("covers the regions the club's following actually lives in", () => {
    // Europe outside the UK was missing entirely, and Norway has the largest
    // supporters' club outside England. Latin America and east Asia were absent.
    const sample = {
      "Europe/Oslo": "Norway",
      "Europe/Berlin": "Germany",
      "Europe/Madrid": "Spain",
      "Asia/Tokyo": "Japan",
      "Asia/Seoul": "South Korea",
      "America/Sao_Paulo": "Brazil",
      "Asia/Dhaka": "Bangladesh",
      "Africa/Lagos": "Nigeria",
    };
    for (const [zone, country] of Object.entries(sample)) {
      expect(findBroadcaster("Premier League", zone)?.country, zone).toBe(country);
    }
  });

  it("holds the three rows that were found wrong on 2026-10-12", () => {
    // Australia pointed at Optus Sport, which shut down on 1 August 2025.
    expect(findBroadcaster("Premier League", "Australia/Sydney")?.service).toBe("Stan Sport");
    // Thailand pointed at TrueVisions, which stopped carrying the league after 2024/25.
    expect(findBroadcaster("Premier League", "Asia/Bangkok")?.service).toBe("AIS Play / MONOMAX");
    // The Philippines pointed at Premier Sports; its current holder could not be
    // confirmed, and an unknown country is meant to render nothing.
    expect(findBroadcaster("Premier League", "Asia/Manila")).toBeNull();
  });

  it("gives every entry both a country and a service", () => {
    for (const zone of KNOWN_TIME_ZONES) {
      const b = findBroadcaster("Premier League", zone);
      expect(b?.country, zone).toBeTruthy();
      expect(b?.service, zone).toBeTruthy();
    }
  });
});
