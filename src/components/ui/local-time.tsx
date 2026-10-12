"use client";

import { useViewerTimeZone } from "@/hooks/use-viewer-time-zone";
import {
  defaultTimeZoneForLocale,
  formatMatchDayMonth,
  formatMatchTime,
  formatZoneOffset,
} from "@/lib/format-match-date";

type Locale = "vi" | "en";

interface LocalTimeProps {
  /** ISO string of the instant (a string keeps the prop serialisable from server components). */
  iso: string;
  locale: Locale;
}

/**
 * `22:30` in the viewer's time zone.
 *
 * The server render has no way to know that zone, so it falls back to
 * `defaultTimeZoneForLocale` and `useViewerTimeZone` corrects it on hydration.
 * Any label beside these must therefore say whose time it is in the viewer's
 * terms ("Your time"), never name a country.
 */
export function LocalMatchTime({ iso, locale }: LocalTimeProps) {
  const zone = useViewerTimeZone(defaultTimeZoneForLocale(locale));
  return <>{formatMatchTime(new Date(iso), zone)}</>;
}

/** `Sun, 11 Oct` (or with the year) in the viewer's time zone. */
export function LocalMatchDay({ iso, locale, withYear = false }: LocalTimeProps & { withYear?: boolean }) {
  const zone = useViewerTimeZone(defaultTimeZoneForLocale(locale));
  return <>{formatMatchDayMonth(new Date(iso), locale, withYear, zone)}</>;
}

/** `GMT+7` for the viewer's zone at that instant. */
export function LocalZoneOffset({ iso, locale }: LocalTimeProps) {
  const zone = useViewerTimeZone(defaultTimeZoneForLocale(locale));
  return <>{formatZoneOffset(new Date(iso), zone)}</>;
}

/**
 * `22:30 Your time · Sun, 11 Oct` for a published-at instant.
 *
 * The news article header used to build this string on the server and label it
 * from the interface language: "UK time" in English, "giờ VN" in Vietnamese. A
 * Vietnamese reader in Berlin was told Vietnam's clock was theirs, and the page
 * is prerendered, so the same HTML went to every country. The zone now comes
 * from the browser and the label says only that it is the reader's own.
 */
export function LocalPublishedTime({ iso, locale, zoneLabel }: LocalTimeProps & { zoneLabel: string }) {
  const zone = useViewerTimeZone(defaultTimeZoneForLocale(locale));
  const date = new Date(iso);
  return (
    <>
      {formatMatchTime(date, zone)} {zoneLabel} · {formatMatchDayMonth(date, locale, false, zone)}
    </>
  );
}

/**
 * `18:18` in the viewer's own time zone.
 *
 * For meta lines that previously printed a server-chosen zone and labelled it
 * from the interface language — the digest said "Posted at 18:18 UK time" to
 * every English reader, wherever they were. The label beside this says whose
 * time it is in the reader's terms; it must never name a country.
 */
export function LocalTimeOfDay({ iso, locale }: LocalTimeProps) {
  const zone = useViewerTimeZone(defaultTimeZoneForLocale(locale));
  return <>{formatMatchTime(new Date(iso), zone)}</>;
}
