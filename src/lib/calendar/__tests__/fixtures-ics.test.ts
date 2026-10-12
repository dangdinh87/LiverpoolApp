import { describe, expect, it } from "vitest";
import type { Fixture } from "@/lib/types/football";
import { buildFixturesIcs, icsEscape, icsFold, icsUtc } from "@/lib/calendar/fixtures-ics";

function fixture(over: Partial<{ id: number; date: string; status: string; home: string; away: string; venue: string | null }> = {}): Fixture {
  return {
    fixture: {
      id: over.id ?? 560598,
      date: over.date ?? "2026-10-11T15:30:00Z",
      venue: { id: null, name: over.venue === undefined ? "Anfield" : over.venue, city: null },
      status: { long: "", short: over.status ?? "NS", elapsed: null },
    },
    league: { id: 2021, name: "Premier League", country: "England", logo: "", season: 2026, round: "Matchday 6" },
    teams: {
      home: { id: 40, name: over.home ?? "Liverpool FC", logo: "", winner: null },
      away: { id: 65, name: over.away ?? "Manchester City FC", logo: "", winner: null },
    },
    goals: { home: 2, away: 1 },
    score: { halftime: { home: null, away: null }, fulltime: { home: null, away: null }, extratime: { home: null, away: null }, penalty: { home: null, away: null } },
  } as Fixture;
}

const options = {
  siteUrl: "https://redsabroad.com",
  matchPath: (id: number) => `/fixtures/${id}`,
  text: { calendarName: "Liverpool fixtures", calendarDescription: "Every match, in your time zone", matchPage: "Match page", reminder: "Kick-off in 30 minutes" },
  now: new Date("2026-10-12T00:00:00Z"),
};

describe("fixtures ics", () => {
  it("writes UTC times, a stable UID, a reminder and no score", () => {
    const ics = buildFixturesIcs([fixture()], options);
    expect(ics).toContain("DTSTART:20261011T153000Z\r\n");
    expect(ics).toContain("DTEND:20261011T172500Z\r\n");
    expect(ics).toContain("UID:fixture-560598@redsabroad.com\r\n");
    expect(ics).toContain("SUMMARY:Liverpool v Manchester City (Premier League)\r\n");
    expect(ics).toContain("TRIGGER:-PT30M");
    expect(ics).toContain("URL:https://redsabroad.com/fixtures/560598");
    expect(ics).not.toMatch(/2\s*[-–]\s*1/);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("orders events by kick-off and marks postponed matches tentative", () => {
    const ics = buildFixturesIcs(
      [fixture({ id: 2, date: "2026-11-01T15:00:00Z", status: "PST" }), fixture({ id: 1, date: "2026-10-01T15:00:00Z" })],
      options,
    );
    expect(ics.indexOf("fixture-1@")).toBeLessThan(ics.indexOf("fixture-2@"));
    expect(ics).toContain("STATUS:TENTATIVE");
  });

  it("skips a missing venue and an unparseable date", () => {
    const ics = buildFixturesIcs([fixture({ venue: null }), fixture({ id: 9, date: "TBD" })], options);
    expect(ics).not.toContain("LOCATION:");
    expect(ics).not.toContain("fixture-9@");
  });

  it("escapes text and folds long lines without splitting characters", () => {
    expect(icsEscape("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
    const long = "DESCRIPTION:" + "Đây là một dòng tiếng Việt rất dài ".repeat(5);
    const folded = icsFold(long);
    for (const line of folded.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(folded.split("\r\n").map((l, i) => (i === 0 ? l : l.slice(1))).join("")).toBe(long);
    expect(icsUtc(new Date("2026-01-02T03:04:05Z"))).toBe("20260102T030405Z");
  });
});
