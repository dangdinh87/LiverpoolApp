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
 * in most markets, and a confident wrong answer is worse than none. For the
 * same reason a market whose rights holder could not be confirmed is left out
 * entirely rather than guessed at — the Philippines is absent on purpose.
 *
 * Checked 2026-10-12 against the Premier League's 2025-28 cycle. Rights move,
 * and three entries here were already wrong when that check was made:
 *   - Australia said Optus Sport, which shut down on 1 August 2025 when Nine
 *     bought the rights for Stan Sport. Readers were being sent to a service
 *     that no longer exists.
 *   - Thailand said TrueVisions, which stopped carrying the league after
 *     2024/25; Jasmine (JAS) holds it now, watched on AIS Play / MONOMAX.
 *   - the Philippines said Premier Sports, which no longer holds it.
 * Re-check the table at the start of each season, and when in doubt delete the
 * row: anything this table does not know about renders nothing at all.
 */

export interface Broadcaster {
  /** Country name as shown to the reader; translated copy wraps it. */
  country: string;
  /** Service to watch on. */
  service: string;
}

/**
 * One row per market, so a service sold across several countries — Viaplay
 * across the Nordics, beIN across MENA, ESPN across South America — is named
 * once instead of being repeated per time zone.
 *
 * `zones` lists every IANA zone in that country, because a reader in Perth and
 * a reader in Sydney are both in Australia. A zone missing from the list is a
 * reader who sees nothing, and a misspelt one can never match, so the suite
 * checks each string against `Intl`.
 */
interface Market {
  country: string;
  service: string;
  zones: string[];
}

const MARKETS: Market[] = [
  // ── United Kingdom and Ireland ────────────────────────────────────────────
  { country: "the UK", service: "Sky Sports / TNT Sports", zones: ["Europe/London"] },
  { country: "Ireland", service: "Premier Sports / Sky Sports", zones: ["Europe/Dublin"] },

  // ── Nordics, Netherlands: one Viaplay deal ────────────────────────────────
  { country: "Norway", service: "Viaplay", zones: ["Europe/Oslo"] },
  { country: "Sweden", service: "Viaplay", zones: ["Europe/Stockholm"] },
  { country: "Denmark", service: "Viaplay", zones: ["Europe/Copenhagen"] },
  { country: "Finland", service: "Viaplay", zones: ["Europe/Helsinki"] },
  { country: "the Netherlands", service: "Viaplay", zones: ["Europe/Amsterdam"] },
  { country: "Iceland", service: "Sýn Sport", zones: ["Atlantic/Reykjavik"] },

  // ── German-speaking Europe and Italy: Sky ─────────────────────────────────
  { country: "Germany", service: "Sky Sport", zones: ["Europe/Berlin", "Europe/Busingen"] },
  { country: "Austria", service: "Sky Sport", zones: ["Europe/Vienna"] },
  { country: "Switzerland", service: "Sky Sport", zones: ["Europe/Zurich"] },
  { country: "Italy", service: "Sky Sport", zones: ["Europe/Rome"] },

  // ── Rest of western and southern Europe ───────────────────────────────────
  {
    country: "Spain",
    service: "DAZN / Movistar Plus+",
    zones: ["Europe/Madrid", "Atlantic/Canary", "Africa/Ceuta"],
  },
  {
    country: "Portugal",
    service: "DAZN",
    zones: ["Europe/Lisbon", "Atlantic/Madeira", "Atlantic/Azores"],
  },
  { country: "France", service: "CANAL+", zones: ["Europe/Paris"] },
  { country: "Belgium", service: "Play Sports", zones: ["Europe/Brussels"] },
  { country: "Greece", service: "Nova Sports", zones: ["Europe/Athens"] },
  { country: "Malta", service: "Total Sports Network", zones: ["Europe/Malta"] },
  { country: "Cyprus", service: "Cytavision Sports", zones: ["Asia/Nicosia", "Asia/Famagusta"] },

  // ── Central and eastern Europe ────────────────────────────────────────────
  { country: "Poland", service: "CANAL+", zones: ["Europe/Warsaw"] },
  { country: "the Czech Republic", service: "CANAL+ Sport", zones: ["Europe/Prague"] },
  { country: "Slovakia", service: "CANAL+ Sport", zones: ["Europe/Bratislava"] },
  { country: "Hungary", service: "Spíler TV / Arena4", zones: ["Europe/Budapest"] },
  { country: "Romania", service: "Voyo", zones: ["Europe/Bucharest"] },
  { country: "Serbia", service: "Arena Sport", zones: ["Europe/Belgrade"] },
  { country: "Croatia", service: "Arena Sport", zones: ["Europe/Zagreb"] },
  { country: "Slovenia", service: "Arena Sport", zones: ["Europe/Ljubljana"] },
  { country: "Bosnia and Herzegovina", service: "Arena Sport", zones: ["Europe/Sarajevo"] },
  { country: "North Macedonia", service: "Arena Sport", zones: ["Europe/Skopje"] },
  { country: "Montenegro", service: "Arena Sport", zones: ["Europe/Podgorica"] },
  { country: "Estonia", service: "Go3 Sport", zones: ["Europe/Tallinn"] },
  { country: "Latvia", service: "Go3 Sport", zones: ["Europe/Riga"] },
  { country: "Lithuania", service: "Go3 Sport", zones: ["Europe/Vilnius"] },
  { country: "Ukraine", service: "Setanta Sports", zones: ["Europe/Kyiv", "Europe/Simferopol"] },
  { country: "Türkiye", service: "beIN Sports", zones: ["Europe/Istanbul"] },

  // ── South-east Asia ───────────────────────────────────────────────────────
  { country: "Vietnam", service: "FPT Play", zones: ["Asia/Ho_Chi_Minh", "Asia/Saigon"] },
  { country: "Thailand", service: "AIS Play / MONOMAX", zones: ["Asia/Bangkok"] },
  { country: "Laos", service: "AIS Play / MONOMAX", zones: ["Asia/Vientiane"] },
  { country: "Cambodia", service: "AIS Play / MONOMAX", zones: ["Asia/Phnom_Penh"] },
  {
    country: "Indonesia",
    service: "Vidio",
    zones: ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura", "Asia/Pontianak"],
  },
  { country: "Malaysia", service: "Astro / sooka", zones: ["Asia/Kuala_Lumpur", "Asia/Kuching"] },
  { country: "Singapore", service: "StarHub", zones: ["Asia/Singapore"] },
  { country: "Myanmar", service: "CANAL+", zones: ["Asia/Yangon"] },

  // ── East Asia ─────────────────────────────────────────────────────────────
  { country: "Japan", service: "U-NEXT", zones: ["Asia/Tokyo"] },
  { country: "South Korea", service: "Coupang Play", zones: ["Asia/Seoul"] },
  { country: "China", service: "Migu / CCTV", zones: ["Asia/Shanghai", "Asia/Chongqing", "Asia/Urumqi"] },
  { country: "Hong Kong", service: "now TV", zones: ["Asia/Hong_Kong"] },
  { country: "Taiwan", service: "ELTA", zones: ["Asia/Taipei"] },
  { country: "Macau", service: "M Plus", zones: ["Asia/Macau"] },
  { country: "Mongolia", service: "Premier Sports Network", zones: ["Asia/Ulaanbaatar"] },

  // ── South Asia ────────────────────────────────────────────────────────────
  {
    country: "India",
    service: "Star Sports / JioHotstar",
    zones: ["Asia/Kolkata", "Asia/Calcutta"],
  },
  { country: "Sri Lanka", service: "Star Sports", zones: ["Asia/Colombo"] },
  { country: "Nepal", service: "Star Sports", zones: ["Asia/Kathmandu"] },
  { country: "Bangladesh", service: "Toffee / Myco", zones: ["Asia/Dhaka"] },
  { country: "Pakistan", service: "Myco", zones: ["Asia/Karachi"] },
  { country: "the Maldives", service: "ICE Network", zones: ["Indian/Maldives"] },

  // ── Middle East and north Africa: one beIN deal ───────────────────────────
  {
    country: "the Middle East",
    service: "beIN Sports",
    zones: [
      "Asia/Dubai",
      "Asia/Riyadh",
      "Asia/Qatar",
      "Asia/Kuwait",
      "Asia/Bahrain",
      "Asia/Muscat",
      "Asia/Amman",
      "Asia/Beirut",
      "Asia/Baghdad",
    ],
  },
  {
    country: "north Africa",
    service: "beIN Sports",
    zones: ["Africa/Cairo", "Africa/Tunis", "Africa/Algiers", "Africa/Casablanca", "Africa/Tripoli"],
  },
  { country: "Israel", service: "Sport 1", zones: ["Asia/Jerusalem"] },

  // ── Sub-Saharan Africa — one of the club's largest followings ─────────────
  { country: "Nigeria", service: "SuperSport", zones: ["Africa/Lagos"] },
  { country: "Ghana", service: "SuperSport", zones: ["Africa/Accra"] },
  { country: "Kenya", service: "SuperSport", zones: ["Africa/Nairobi"] },
  { country: "Tanzania", service: "SuperSport", zones: ["Africa/Dar_es_Salaam"] },
  { country: "Uganda", service: "SuperSport", zones: ["Africa/Kampala"] },
  { country: "Ethiopia", service: "SuperSport", zones: ["Africa/Addis_Ababa"] },
  { country: "South Africa", service: "SuperSport / SABC Sport", zones: ["Africa/Johannesburg"] },
  { country: "Zimbabwe", service: "SuperSport", zones: ["Africa/Harare"] },
  { country: "Zambia", service: "SuperSport", zones: ["Africa/Lusaka"] },
  { country: "Senegal", service: "CANAL+ Afrique", zones: ["Africa/Dakar"] },
  { country: "Ivory Coast", service: "CANAL+ Afrique", zones: ["Africa/Abidjan"] },
  { country: "Cameroon", service: "CANAL+ Afrique", zones: ["Africa/Douala"] },

  // ── North America ─────────────────────────────────────────────────────────
  {
    country: "the US",
    service: "NBC / Peacock",
    zones: [
      "America/New_York",
      "America/Detroit",
      "America/Chicago",
      "America/Denver",
      "America/Phoenix",
      "America/Los_Angeles",
      "America/Anchorage",
      "Pacific/Honolulu",
    ],
  },
  {
    country: "Canada",
    service: "fuboTV",
    zones: [
      "America/Toronto",
      "America/Vancouver",
      "America/Edmonton",
      "America/Winnipeg",
      "America/Halifax",
      "America/St_Johns",
    ],
  },
  {
    country: "Mexico",
    service: "HBO Max / Fox Sports",
    zones: ["America/Mexico_City", "America/Monterrey", "America/Tijuana", "America/Merida"],
  },

  // ── Central and South America: one ESPN deal ──────────────────────────────
  {
    country: "Brazil",
    service: "ESPN / CazéTV",
    zones: ["America/Sao_Paulo", "America/Bahia", "America/Fortaleza", "America/Manaus", "America/Recife"],
  },
  { country: "Argentina", service: "ESPN", zones: ["America/Argentina/Buenos_Aires", "America/Argentina/Cordoba"] },
  { country: "Chile", service: "ESPN", zones: ["America/Santiago"] },
  { country: "Colombia", service: "ESPN", zones: ["America/Bogota"] },
  { country: "Peru", service: "ESPN", zones: ["America/Lima"] },
  { country: "Uruguay", service: "ESPN", zones: ["America/Montevideo"] },
  { country: "Ecuador", service: "ESPN", zones: ["America/Guayaquil"] },
  { country: "Bolivia", service: "ESPN", zones: ["America/La_Paz"] },
  { country: "Paraguay", service: "ESPN", zones: ["America/Asuncion"] },
  { country: "Venezuela", service: "ESPN", zones: ["America/Caracas"] },

  // ── Oceania ───────────────────────────────────────────────────────────────
  {
    country: "Australia",
    service: "Stan Sport",
    zones: [
      "Australia/Sydney",
      "Australia/Melbourne",
      "Australia/Brisbane",
      "Australia/Perth",
      "Australia/Adelaide",
      "Australia/Hobart",
      "Australia/Darwin",
    ],
  },
  { country: "New Zealand", service: "Sky Sport", zones: ["Pacific/Auckland"] },
  { country: "Fiji", service: "Digicel", zones: ["Pacific/Fiji"] },
];

const BY_TIME_ZONE: Record<string, Broadcaster> = Object.fromEntries(
  MARKETS.flatMap(({ country, service, zones }) =>
    zones.map((zone) => [zone, { country, service }] as const),
  ),
);

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

export const KNOWN_TIME_ZONES = Object.keys(BY_TIME_ZONE);
