import { describe, expect, it } from "vitest";
import { compareDatesDesc, getValidDateMs, nowIso, toIsoDateOrFallback } from "../date";

describe("news date helpers", () => {
  it("returns null for invalid dates", () => {
    expect(getValidDateMs("not-a-date")).toBeNull();
    expect(getValidDateMs("")).toBeNull();
    expect(getValidDateMs(Symbol("bad-date"))).toBeNull();
  });

  it("normalizes valid dates to ISO strings", () => {
    expect(toIsoDateOrFallback("2026-05-18T03:04:05.000Z", "2026-01-01T00:00:00.000Z")).toBe(
      "2026-05-18T03:04:05.000Z"
    );
  });

  it("uses fallback ISO when source date is invalid", () => {
    expect(toIsoDateOrFallback("not-a-date", "2026-01-01T00:00:00.000Z")).toBe(
      "2026-01-01T00:00:00.000Z"
    );
  });

  it("falls back instead of throwing for out-of-range dates", () => {
    expect(toIsoDateOrFallback(9e15, "2026-01-01T00:00:00.000Z")).toBe(
      "2026-01-01T00:00:00.000Z"
    );
  });

  it("returns a valid ISO timestamp for now", () => {
    expect(Number.isFinite(new Date(nowIso()).getTime())).toBe(true);
  });

  it("sorts invalid dates behind valid dates", () => {
    expect(compareDatesDesc("not-a-date", "2026-05-18T03:04:05.000Z")).toBeGreaterThan(0);
    expect(compareDatesDesc("2026-05-18T03:04:05.000Z", "not-a-date")).toBeLessThan(0);
  });
});
