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

/** `22:30` in the viewer's time zone (Vietnam / London on the server render). */
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
