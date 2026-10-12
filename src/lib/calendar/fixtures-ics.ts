/**
 * Liverpool fixtures as an iCalendar feed (RFC 5545) that phones subscribe to.
 *
 * Times are written in UTC (`...Z`), so every calendar app shows them in the
 * subscriber's own time zone with no conversion on our side — the whole point
 * for fans abroad. Summaries never carry a score: the calendar stays
 * spoiler-free for people who watch the replay.
 */

import type { Fixture } from "@/lib/types/football";
import { displayTeamName } from "@/components/fixtures/team-name";

export interface FixturesIcsText {
  calendarName: string;
  calendarDescription: string;
  /** "Match page" — label before the link in each event's description. */
  matchPage: string;
  /** Reminder text shown 30 minutes before kick-off. */
  reminder: string;
}

export interface FixturesIcsOptions {
  /** Absolute site origin, e.g. https://redsabroad.com */
  siteUrl: string;
  /** Builds the in-site path of a match page (locale prefix included). */
  matchPath: (fixtureId: number) => string;
  text: FixturesIcsText;
  /** Stamp for DTSTAMP; injectable for tests. */
  now?: Date;
}

/** A match block in the calendar: kick-off plus a little under two hours. */
const MATCH_MINUTES = 115;
const REMINDER = "-PT30M";
const REFRESH = "PT6H";

const pad = (n: number) => String(n).padStart(2, "0");

/** 2026-10-11T15:30:00Z -> 20261011T153000Z */
export function icsUtc(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/** TEXT values escape backslash, semicolon, comma and newlines. */
export function icsEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 octets continue on the next line after a space; never split a UTF-8 character. */
export function icsFold(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    const limit = parts.length === 0 ? 75 : 74; // continuation lines lose one octet to the leading space
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function eventStatus(short: string): string {
  if (short === "CANC") return "CANCELLED";
  if (short === "PST" || short === "TBD" || short === "SUSP") return "TENTATIVE";
  return "CONFIRMED";
}

export function buildFixturesIcs(fixtures: Fixture[], options: FixturesIcsOptions): string {
  const { siteUrl, matchPath, text } = options;
  const host = new URL(siteUrl).host;
  const stamp = icsUtc(options.now ?? new Date());

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Anfield Daily//Liverpool fixtures//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsEscape(text.calendarName)}`,
    `X-WR-CALDESC:${icsEscape(text.calendarDescription)}`,
    `REFRESH-INTERVAL;VALUE=DURATION:${REFRESH}`,
    `X-PUBLISHED-TTL:${REFRESH}`,
  ];

  const sorted = [...fixtures].sort((a, b) => a.fixture.date.localeCompare(b.fixture.date));
  for (const f of sorted) {
    const start = new Date(f.fixture.date);
    if (Number.isNaN(start.getTime())) continue;
    const end = new Date(start.getTime() + MATCH_MINUTES * 60_000);
    const url = `${siteUrl}${matchPath(f.fixture.id)}`;
    const summary = `${displayTeamName(f.teams.home.name)} v ${displayTeamName(f.teams.away.name)} (${f.league.name})`;

    lines.push(
      "BEGIN:VEVENT",
      `UID:fixture-${f.fixture.id}@${host}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsUtc(start)}`,
      `DTEND:${icsUtc(end)}`,
      `SUMMARY:${icsEscape(summary)}`,
      `DESCRIPTION:${icsEscape(`${f.league.name}\n${text.matchPage}: ${url}`)}`,
      `URL:${url}`,
      `STATUS:${eventStatus(f.fixture.status.short)}`,
    );
    if (f.fixture.venue.name) lines.push(`LOCATION:${icsEscape(f.fixture.venue.name)}`);
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `TRIGGER:${REMINDER}`,
      `DESCRIPTION:${icsEscape(text.reminder)}`,
      "END:VALARM",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.map(icsFold).join("\r\n") + "\r\n";
}
