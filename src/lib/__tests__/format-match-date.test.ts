import { describe, it, expect } from "vitest";
import {
  defaultTimeZoneForLocale,
  formatZoneOffset,
  formatDayMonth,
  formatDayMonthYear,
  formatMonthYear,
  formatMatchDate,
  formatMatchDayMonth,
  formatMatchTime,
  getMatchDateParts,
  isSameMatchDay,
} from "../format-match-date";

// 12 Sep 2026 14:00 UTC = 21:00 on Saturday in Vietnam (UTC+7).
const KICK_OFF = new Date("2026-09-12T14:00:00Z");

describe("formatMatchDate", () => {
  it("names the weekday from our own table, not the runtime's ICU", () => {
    // Node's ICU renders vi-VN weekday:"short" as "Th 7" while Chrome renders
    // "Thứ 7" — the mismatch that broke hydration on the homepage. Whatever the
    // runtime would say, this must be the value the browser also produces.
    expect(formatMatchDate(KICK_OFF, "vi")).toBe("Thứ 7, 12/09 · 21:00");
    expect(formatMatchDate(KICK_OFF, "en")).toBe("Sat, 12 Sep · 21:00");
  });

  it("reads the clock in Vietnam time regardless of the runtime timezone", () => {
    // On Vercel the server runs in UTC, where this instant is 14:00 on the 12th.
    // Fans want the Vietnam kick-off, and both sides of hydration must agree.
    expect(formatMatchTime(KICK_OFF)).toBe("21:00");
    expect(getMatchDateParts(KICK_OFF)).toMatchObject({
      day: 12,
      month: 9,
      year: 2026,
      hour: 21,
      minute: 0,
    });
  });

  it("keeps a late kick-off on the Vietnamese calendar day it belongs to", () => {
    // 20:00 UTC on the 12th is 03:00 on the 13th in Vietnam.
    const lateNight = new Date("2026-09-12T20:00:00Z");
    expect(formatMatchDate(lateNight, "vi")).toBe("CN, 13/09 · 03:00");
  });

  it("reports midnight as 00:00, never 24:00", () => {
    // 17:00 UTC is exactly midnight in Vietnam; some ICU builds render "24".
    const midnight = new Date("2026-09-12T17:00:00Z");
    expect(formatMatchTime(midnight)).toBe("00:00");
  });

  it("compares calendar days in Vietnam time, not the runtime's", () => {
    const sameVietnamDay = new Date("2026-09-12T02:00:00Z"); // 09:00 VN, 12th
    const nextVietnamDay = new Date("2026-09-12T18:00:00Z"); // 01:00 VN, 13th
    expect(isSameMatchDay(KICK_OFF, sameVietnamDay)).toBe(true);
    expect(isSameMatchDay(KICK_OFF, nextVietnamDay)).toBe(false);
  });

  it("falls back to English weekday names for an unknown locale", () => {
    expect(formatMatchDate(KICK_OFF, "fr")).toBe("Sat, 12 Sep · 21:00");
  });
});

describe("formatMatchDayMonth", () => {
  it("renders the fixture-list shape without asking the runtime for names", () => {
    expect(formatMatchDayMonth(KICK_OFF, "vi")).toBe("Thứ 7, 12 thg 9");
    expect(formatMatchDayMonth(KICK_OFF, "en")).toBe("Sat, 12 Sep");
  });

  it("appends the year when a detail page asks for it", () => {
    expect(formatMatchDayMonth(KICK_OFF, "vi", true)).toBe("Thứ 7, 12 thg 9 2026");
    expect(formatMatchDayMonth(KICK_OFF, "en", true)).toBe("Sat, 12 Sep 2026");
  });

  it("rolls the weekday over with the Vietnamese calendar day", () => {
    const lateNight = new Date("2026-09-12T20:00:00Z"); // 03:00 on the 13th, VN
    expect(formatMatchDayMonth(lateNight, "vi")).toBe("CN, 13 thg 9");
  });
});

describe("formatDayMonthYear", () => {
  it("drops the weekday", () => {
    expect(formatDayMonthYear(KICK_OFF, "vi")).toBe("12 thg 9 2026");
    expect(formatDayMonthYear(KICK_OFF, "en")).toBe("12 Sep 2026");
  });
});

describe("formatDayMonth / formatMonthYear", () => {
  it("renders the compact news-card timestamp", () => {
    expect(formatDayMonth(KICK_OFF, "vi")).toBe("12 thg 9");
    expect(formatDayMonth(KICK_OFF, "en")).toBe("12 Sep");
  });

  it("renders the member-since shape", () => {
    expect(formatMonthYear(KICK_OFF, "vi")).toBe("tháng 9 2026");
    expect(formatMonthYear(KICK_OFF, "en")).toBe("September 2026");
  });

  it("uses the Vietnamese calendar day, not the runtime's", () => {
    // 20:00 UTC on the 12th is already the 13th in Vietnam. On Vercel (UTC)
    // the server would say "12 thg 9" and the browser "13 thg 9" — React #418.
    const lateNight = new Date("2026-09-12T20:00:00Z");
    expect(formatDayMonth(lateNight, "vi")).toBe("13 thg 9");
  });
});

describe("viewer time zones", () => {
  // 14:00 UTC on Saturday 12 Sep 2026 is the same instant everywhere.
  it("shows the same kick-off in each viewer's own zone", () => {
    expect(formatMatchTime(KICK_OFF, "Asia/Jakarta")).toBe("21:00");
    expect(formatMatchTime(KICK_OFF, "Europe/London")).toBe("15:00"); // BST
    expect(formatMatchTime(KICK_OFF, "Asia/Kolkata")).toBe("19:30");
    expect(formatMatchTime(KICK_OFF, "America/New_York")).toBe("10:00"); // EDT
  });

  it("moves the calendar day with the zone", () => {
    // 22:00 UTC is already Sunday morning in Vietnam but still Saturday in London.
    const lateSaturday = new Date("2026-09-12T22:00:00Z");
    expect(formatMatchDayMonth(lateSaturday, "en", false, "Asia/Ho_Chi_Minh")).toBe("Sun, 13 Sep");
    expect(formatMatchDayMonth(lateSaturday, "en", false, "Europe/London")).toBe("Sat, 12 Sep");
    expect(isSameMatchDay(KICK_OFF, lateSaturday, "Asia/Ho_Chi_Minh")).toBe(false);
    expect(isSameMatchDay(KICK_OFF, lateSaturday, "Europe/London")).toBe(true);
  });

  it("keeps Vietnam time when no zone is given", () => {
    expect(formatMatchTime(KICK_OFF)).toBe("21:00");
  });

  it("labels the viewer's UTC offset, including half-hour zones", () => {
    expect(formatZoneOffset(KICK_OFF, "Asia/Ho_Chi_Minh")).toBe("GMT+7");
    expect(formatZoneOffset(KICK_OFF, "Asia/Kolkata")).toBe("GMT+5:30");
    expect(formatZoneOffset(KICK_OFF, "Europe/London")).toBe("GMT+1");
    // Winter in London is a zero offset: Chrome says "GMT+0", Node says "GMT". Always "GMT".
    expect(formatZoneOffset(new Date("2026-12-05T15:00:00Z"), "Europe/London")).toBe("GMT");
    expect(formatZoneOffset(new Date("2026-12-05T15:00:00Z"), "UTC")).toBe("GMT");
  });

  it("falls back to Vietnam for vi and London for everyone else", () => {
    expect(defaultTimeZoneForLocale("vi")).toBe("Asia/Ho_Chi_Minh");
    expect(defaultTimeZoneForLocale("en")).toBe("Europe/London");
  });
});
