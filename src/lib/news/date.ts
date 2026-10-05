const FALLBACK_ISO = "1970-01-01T00:00:00.000Z";
const MAX_DATE_MS = 8.64e15;

function isoFromMs(ms: number): string | null {
  if (!Number.isFinite(ms) || Math.abs(ms) > MAX_DATE_MS) return null;

  try {
    const date = new Date(ms);
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  } catch {
    return null;
  }
}

export function nowIso(): string {
  return isoFromMs(Date.now()) ?? FALLBACK_ISO;
}

export function getValidDateMs(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  try {
    const ms = value instanceof Date ? value.getTime() : new Date(value as string).getTime();
    return Number.isFinite(ms) && Math.abs(ms) <= MAX_DATE_MS ? ms : null;
  } catch {
    return null;
  }
}

export function toIsoDateOrFallback(
  value: unknown,
  fallbackIso: string = nowIso()
): string {
  const ms = getValidDateMs(value);
  const iso = ms !== null ? isoFromMs(ms) : null;
  if (iso !== null) return iso;

  const fallbackMs = getValidDateMs(fallbackIso);
  return fallbackMs !== null ? isoFromMs(fallbackMs) ?? nowIso() : nowIso();
}

export function compareDatesDesc(
  left: unknown,
  right: unknown
): number {
  return (getValidDateMs(right) ?? 0) - (getValidDateMs(left) ?? 0);
}

// ---------------------------------------------------------------------------
// Feed date parsing
// ---------------------------------------------------------------------------

/** Vietnam has no DST; zone-less dates from VI sources are local time. */
const VN_OFFSET_MINUTES = 7 * 60;

const EXPLICIT_ZONE = /\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\s*(?:Z|GMT|UTC|UT|[+-]\d{2}(?::?\d{2})?)$/i;
const YMD_HMS = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/;
const MDY_HMS_AMPM = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i;

function utcMsFromLocal(
  y: number, mo: number, d: number, h: number, mi: number, s: number, offsetMinutes: number
): number | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || s > 59) return null;
  const ms = Date.UTC(y, mo - 1, d, h, mi, s) - offsetMinutes * 60_000;
  return Number.isFinite(ms) ? ms : null;
}

const ABBR_OFFSET_MINUTES: Record<string, number> = { BST: 60, CEST: 120, EDT: -240 };
const ZONE_ABBR = /^(.*\S)\s+(BST|CEST|EDT|EST)$/i;
const SHORT_OFFSET = /([+-])(\d):(\d{2})$/; // "+7:00" -> "+07:00" (bongdaplus)

/**
 * Zone names V8 cannot parse (BST, CEST) or parses with the wrong DST (ESPN labels
 * summer times "EST" but means Eastern Time, i.e. -04:00 from March to November)
 * are resolved explicitly. Returns epoch ms, or undefined when the text has no such zone.
 */
function parseAbbreviatedZoneMs(text: string): number | undefined {
  const m = ZONE_ABBR.exec(text);
  if (!m) return undefined;
  const asUtc = new Date(`${m[1]} GMT`).getTime();
  if (!Number.isFinite(asUtc)) return undefined;
  const abbr = m[2].toUpperCase();
  const month = new Date(asUtc).getUTCMonth(); // 0-based
  const offset = abbr === "EST" ? (month >= 2 && month <= 10 ? -240 : -300) : ABBR_OFFSET_MINUTES[abbr];
  return asUtc - offset * 60_000;
}

/**
 * Parse a feed date to epoch ms. Strings with an explicit zone parse as usual;
 * zone-less strings (tuoitre `10/1/2026 12:02:00 PM`, bongda24h `2026/10/01 13:14:24`)
 * are read as `zonelessOffsetMinutes` instead of the machine zone, so results do not
 * depend on whether the runtime is Vercel (UTC) or a dev laptop (+07).
 */
export function parseFeedDateMs(
  raw: unknown,
  zonelessOffsetMinutes: number | null = null
): number | null {
  if (typeof raw !== "string") return getValidDateMs(raw);
  let text = raw.trim();
  if (!text) return null;

  const abbreviated = parseAbbreviatedZoneMs(text);
  if (abbreviated !== undefined) return abbreviated;
  text = text.replace(SHORT_OFFSET, (_, sign: string, h: string, mm: string) => `${sign}0${h}:${mm}`);

  if (zonelessOffsetMinutes !== null && !EXPLICIT_ZONE.test(text)) {
    let m = YMD_HMS.exec(text);
    if (m) {
      return utcMsFromLocal(+m[1], +m[2], +m[3], +m[4], +m[5], +(m[6] ?? 0), zonelessOffsetMinutes);
    }
    m = MDY_HMS_AMPM.exec(text);
    if (m) {
      let hour = +m[4];
      const ampm = m[7]?.toUpperCase();
      if (ampm === "PM" && hour < 12) hour += 12;
      if (ampm === "AM" && hour === 12) hour = 0;
      return utcMsFromLocal(+m[3], +m[1], +m[2], hour, +m[5], +(m[6] ?? 0), zonelessOffsetMinutes);
    }
  }
  return getValidDateMs(text);
}

/** Never let a source publish "in the future": clamp to the fetch time. */
export function clampToNowMs(ms: number, nowMs: number = Date.now()): number {
  return ms > nowMs ? nowMs : ms;
}

/**
 * Feed date → ISO string, or "" when missing/unparseable.
 * Pass `language: "vi"` to read zone-less dates as Vietnam time (+07:00).
 *
 * Future dates are returned as-is on purpose: sync clamps them when storing
 * and, seeing they were in the future, keeps an existing row's date. Clamping
 * here made them look like genuine "now" dates, re-stamped on every sync.
 */
export function normalizeFeedDate(raw: unknown, language: "en" | "vi"): string {
  const ms = parseFeedDateMs(raw, language === "vi" ? VN_OFFSET_MINUTES : null);
  if (ms === null) return "";
  return isoFromMs(ms) ?? "";
}

/**
 * Bongdaplus list text: absolute `18:20 ngày 03/10/2026` (Vietnam time) or relative
 * `15 giờ trước` / `20 phút trước` / `2 ngày trước`. Returns epoch ms or null.
 */
export function parseVietnameseDateText(text: string, nowMs: number = Date.now()): number | null {
  const t = text.trim().toLowerCase();
  const abs = /(\d{1,2}):(\d{2})\s+ngày\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(t);
  if (abs) {
    return utcMsFromLocal(+abs[5], +abs[4], +abs[3], +abs[1], +abs[2], 0, VN_OFFSET_MINUTES);
  }
  const rel = /(\d+)\s*(phút|giờ|ngày)\s+trước/.exec(t);
  if (rel) {
    const unit = rel[2] === "phút" ? 60_000 : rel[2] === "giờ" ? 3_600_000 : 86_400_000;
    return nowMs - +rel[1] * unit;
  }
  return null;
}
