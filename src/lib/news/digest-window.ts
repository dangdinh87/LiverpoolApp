/** Human-readable article window for the digest prompt ("24 hours", "3 days", "7 days"). */
export function describeDigestWindow(hours: number): string {
  if (hours <= 48) return `${hours} hours`;
  if (hours % 24 === 0) return `${hours / 24} days`;
  return `${hours} hours`;
}
