/**
 * Who shows the Premier League, by viewer country.
 *
 * "Where do I watch this" is the question a supporter abroad asks straight
 * after "what time is it". The site used to answer it for Vietnam only and
 * show nothing to everyone else, which is the opposite of the point.
 *
 * The country is inferred from the viewer's IANA time zone rather than from
 * their interface language: an English-speaking reader in Jakarta needs Vidio,
 * not Sky. It needs no permission prompt, no geo-IP lookup and no extra
 * request — the browser already tells us, and the kick-off clock reads the
 * same value (src/hooks/use-viewer-time-zone.ts).
 *
 * Only the Premier League is listed. Rights for the cups are split differently
 * in most markets, and a confident wrong answer is worse than none.
 *
 * Rights move. Each entry carries the season it was checked for; anything the
 * table does not know about renders nothing at all.
 */

export interface Broadcaster {
  /** Country name as shown to the reader; translated copy wraps it. */
  country: string;
  /** Service to watch on. */
  service: string;
}

/** Checked for the 2026/27 season. */
const BY_TIME_ZONE: Record<string, Broadcaster> = {
  // South-east Asia — the site's existing audience, plus the pilot market.
  "Asia/Ho_Chi_Minh": { country: "Vietnam", service: "FPT Play" },
  "Asia/Saigon": { country: "Vietnam", service: "FPT Play" },
  "Asia/Bangkok": { country: "Thailand", service: "True Vision" },
  "Asia/Jakarta": { country: "Indonesia", service: "Vidio" },
  "Asia/Makassar": { country: "Indonesia", service: "Vidio" },
  "Asia/Jayapura": { country: "Indonesia", service: "Vidio" },
  "Asia/Pontianak": { country: "Indonesia", service: "Vidio" },
  "Asia/Kuala_Lumpur": { country: "Malaysia", service: "Astro / sooka" },
  "Asia/Singapore": { country: "Singapore", service: "StarHub" },
  "Asia/Manila": { country: "the Philippines", service: "Premier Sports" },

  // South Asia
  "Asia/Kolkata": { country: "India", service: "JioHotstar" },
  "Asia/Calcutta": { country: "India", service: "JioHotstar" },

  // United Kingdom and Ireland
  "Europe/London": { country: "the UK", service: "Sky Sports / TNT Sports" },
  "Europe/Dublin": { country: "Ireland", service: "Sky Sports / Premier Sports" },

  // North America
  "America/New_York": { country: "the US", service: "NBC / Peacock" },
  "America/Detroit": { country: "the US", service: "NBC / Peacock" },
  "America/Chicago": { country: "the US", service: "NBC / Peacock" },
  "America/Denver": { country: "the US", service: "NBC / Peacock" },
  "America/Phoenix": { country: "the US", service: "NBC / Peacock" },
  "America/Los_Angeles": { country: "the US", service: "NBC / Peacock" },
  "America/Anchorage": { country: "the US", service: "NBC / Peacock" },
  "Pacific/Honolulu": { country: "the US", service: "NBC / Peacock" },
  "America/Toronto": { country: "Canada", service: "fuboTV" },
  "America/Vancouver": { country: "Canada", service: "fuboTV" },
  "America/Edmonton": { country: "Canada", service: "fuboTV" },
  "America/Winnipeg": { country: "Canada", service: "fuboTV" },
  "America/Halifax": { country: "Canada", service: "fuboTV" },

  // Oceania
  "Australia/Sydney": { country: "Australia", service: "Optus Sport" },
  "Australia/Melbourne": { country: "Australia", service: "Optus Sport" },
  "Australia/Brisbane": { country: "Australia", service: "Optus Sport" },
  "Australia/Perth": { country: "Australia", service: "Optus Sport" },
  "Australia/Adelaide": { country: "Australia", service: "Optus Sport" },
  "Pacific/Auckland": { country: "New Zealand", service: "Sky Sport" },

  // Africa — one of the club's largest followings outside Europe.
  "Africa/Lagos": { country: "Nigeria", service: "SuperSport" },
  "Africa/Accra": { country: "Ghana", service: "SuperSport" },
  "Africa/Nairobi": { country: "Kenya", service: "SuperSport" },
  "Africa/Johannesburg": { country: "South Africa", service: "SuperSport" },
  "Africa/Cairo": { country: "Egypt", service: "beIN Sports" },

  // Middle East
  "Asia/Dubai": { country: "the UAE", service: "beIN Sports" },
  "Asia/Riyadh": { country: "Saudi Arabia", service: "beIN Sports" },
  "Asia/Qatar": { country: "Qatar", service: "beIN Sports" },
};

/** The only competition the table covers. */
const COVERED_COMPETITION = "Premier League";

/**
 * Broadcaster for a competition in the viewer's country, or null when the
 * competition is not covered or the country is not in the table.
 */
export function findBroadcaster(
  competition: string | null | undefined,
  timeZone: string | null | undefined,
): Broadcaster | null {
  if (competition !== COVERED_COMPETITION || !timeZone) return null;
  return BY_TIME_ZONE[timeZone] ?? null;
}

/** Time zones the table answers for. Exported for tests. */
export const KNOWN_TIME_ZONES = Object.keys(BY_TIME_ZONE);
