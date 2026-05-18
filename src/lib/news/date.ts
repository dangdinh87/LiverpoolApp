export function getValidDateMs(value: string | null | undefined): number | null {
  if (!value) return null;

  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function toIsoDateOrFallback(
  value: string | null | undefined,
  fallbackIso: string
): string {
  const ms = getValidDateMs(value);
  if (ms !== null) return new Date(ms).toISOString();

  const fallbackMs = getValidDateMs(fallbackIso);
  return fallbackMs !== null ? new Date(fallbackMs).toISOString() : new Date().toISOString();
}

export function compareDatesDesc(
  left: string | null | undefined,
  right: string | null | undefined
): number {
  return (getValidDateMs(right) ?? 0) - (getValidDateMs(left) ?? 0);
}
