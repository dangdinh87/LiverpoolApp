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
