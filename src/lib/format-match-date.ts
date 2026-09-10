/**
 * Deterministic kick-off formatting.
 *
 * Two runtime-dependent things used to leak into the markup, and both broke
 * hydration or correctness:
 *
 * 1. Weekday names came from `toLocaleDateString(loc, { weekday: "short" })`.
 *    Node and Chrome ship different ICU data, so for vi-VN the same instant
 *    renders as "Th 7" on the server (Node ICU 76.1) and "Thứ 7" in the
 *    browser. React discards the server HTML for that subtree — this was the
 *    hydration error on the homepage, raised by NextMatchWidget.
 *
 * 2. Day, month and time came from the runtime's *local* timezone. On Vercel
 *    the server runs in UTC while the visitor's browser does not, so beyond the
 *    mismatch, a 21:00 Vietnam kick-off was rendered as 14:00 in server HTML.
 *
 * Both are fixed by never asking the runtime: weekday names are looked up in a
 * table, and every field is read through a fixed IANA zone. The audience is
 * Vietnamese, so kick-offs are shown in Vietnam time — which is what a fan
 * wants, and identical on both sides of hydration.
 */

/** Kick-offs are quoted in Vietnam time for both locales — the audience is VN. */
export const MATCH_TIME_ZONE = "Asia/Ho_Chi_Minh";

/** Indexed by `Date.getUTCDay()`-style 0=Sunday. */
const WEEKDAYS: Record<string, readonly string[]> = {
  vi: ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

const MONTHS_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTHS_LONG_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTHS_VI = [
  "thg 1", "thg 2", "thg 3", "thg 4", "thg 5", "thg 6",
  "thg 7", "thg 8", "thg 9", "thg 10", "thg 11", "thg 12",
];

export interface MatchDateParts {
  /** 1-31 */
  day: number;
  /** 1-12 */
  month: number;
  year: number;
  /** 0 = Sunday */
  weekday: number;
  hour: number;
  minute: number;
}

/**
 * Break an instant into calendar fields in `MATCH_TIME_ZONE`.
 *
 * `Intl.DateTimeFormat().formatToParts` with an explicit `timeZone` is stable
 * across runtimes for numeric fields — it is only the *localised names* that
 * differ between ICU builds, and none are requested here.
 */
export function getMatchDateParts(date: Date): MatchDateParts {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: MATCH_TIME_ZONE,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  // en-GB weekday abbreviations are ASCII and identical in every ICU build, so
  // this lookup is safe where a localised name would not be.
  const weekday = WEEKDAYS.en.indexOf(get("weekday"));

  return {
    day: Number(get("day")),
    month: Number(get("month")),
    year: Number(get("year")),
    weekday: weekday < 0 ? 0 : weekday,
    // 24-hour formatting yields "24" for midnight in some ICU builds.
    hour: Number(get("hour")) % 24,
    minute: Number(get("minute")),
  };
}

const pad = (n: number) => n.toString().padStart(2, "0");

/** `Thứ 7, 12/09 · 21:00` (vi) or `Sat, 12 Sep · 21:00` (en). */
export function formatMatchDate(date: Date, locale: string): string {
  const { day, month, weekday, hour, minute } = getMatchDateParts(date);
  const names = WEEKDAYS[locale] ?? WEEKDAYS.en;
  const time = `${pad(hour)}:${pad(minute)}`;

  return locale === "vi"
    ? `${names[weekday]}, ${pad(day)}/${pad(month)} · ${time}`
    : `${names[weekday]}, ${pad(day)} ${MONTHS_EN[month - 1]} · ${time}`;
}

/**
 * `Thứ 7, 12 thg 9` (vi) or `Sat, 12 Sep` (en) — the fixture-list shape.
 *
 * Pass `withYear` for a detail page, where the season is not obvious from
 * context.
 */
export function formatMatchDayMonth(
  date: Date,
  locale: string,
  withYear = false
): string {
  const { day, month, year, weekday } = getMatchDateParts(date);
  const isVi = locale === "vi";
  const names = WEEKDAYS[isVi ? "vi" : "en"];
  const monthName = (isVi ? MONTHS_VI : MONTHS_EN)[month - 1];
  const tail = withYear ? ` ${year}` : "";

  return `${names[weekday]}, ${day} ${monthName}${tail}`;
}

/** `12 thg 9` (vi) or `12 Sep` (en) — the compact timestamp used on news cards. */
export function formatDayMonth(date: Date, locale: string): string {
  const { day, month } = getMatchDateParts(date);
  const monthName = (locale === "vi" ? MONTHS_VI : MONTHS_EN)[month - 1];
  return `${day} ${monthName}`;
}

/** `tháng 9 2026` (vi) or `September 2026` (en) — the "member since" shape. */
export function formatMonthYear(date: Date, locale: string): string {
  const { month, year } = getMatchDateParts(date);
  const name =
    locale === "vi" ? `tháng ${month}` : MONTHS_LONG_EN[month - 1];
  return `${name} ${year}`;
}

/** `12 thg 9 2026` (vi) or `12 Sep 2026` (en) — no weekday. */
export function formatDayMonthYear(date: Date, locale: string): string {
  const { day, month, year } = getMatchDateParts(date);
  const monthName = (locale === "vi" ? MONTHS_VI : MONTHS_EN)[month - 1];
  return `${day} ${monthName} ${year}`;
}

/** `21:00` in Vietnam time. */
export function formatMatchTime(date: Date): string {
  const { hour, minute } = getMatchDateParts(date);
  return `${pad(hour)}:${pad(minute)}`;
}

/** Whether two instants fall on the same calendar day in `MATCH_TIME_ZONE`. */
export function isSameMatchDay(a: Date, b: Date): boolean {
  const x = getMatchDateParts(a);
  const y = getMatchDateParts(b);
  return x.year === y.year && x.month === y.month && x.day === y.day;
}
