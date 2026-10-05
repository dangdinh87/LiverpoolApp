import { describe, expect, it } from "vitest";
import {
  clampToNowMs,
  compareDatesDesc,
  getValidDateMs,
  normalizeFeedDate,
  nowIso,
  parseVietnameseDateText,
  toIsoDateOrFallback,
} from "../date";

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

describe("feed date parsing (machine-timezone independent)", () => {
  const NOW = Date.parse("2026-10-04T15:30:00.000Z"); // 22:30 in Vietnam

  it("reads tuoitre M/D/YYYY h:mm:ss AM/PM as Vietnam time", () => {
    expect(normalizeFeedDate("10/1/2026 12:02:00 PM", "vi")).toBe("2026-10-01T05:02:00.000Z");
    expect(normalizeFeedDate("10/4/2026 9:24:00 PM", "vi")).toBe("2026-10-04T14:24:00.000Z");
    expect(normalizeFeedDate("10/2/2026 12:05:00 AM", "vi")).toBe("2026-10-01T17:05:00.000Z");
  });

  it("reads bongda24h YYYY/MM/DD HH:mm:ss as Vietnam time", () => {
    expect(normalizeFeedDate("2026/10/01 13:14:24", "vi")).toBe("2026-10-01T06:14:24.000Z");
  });

  it("respects explicit zones", () => {
    expect(normalizeFeedDate("Sun, 04 Oct 2026 21:42:12 +0700", "vi")).toBe("2026-10-04T14:42:12.000Z");
    expect(normalizeFeedDate("Sun, 04 Oct 2026 14:31:00 +0000", "vi")).toBe("2026-10-04T14:31:00.000Z");
    expect(normalizeFeedDate("Sun, 04 Oct 26 19:16:00 +0700", "vi")).toBe("2026-10-04T12:16:00.000Z");
    expect(normalizeFeedDate("Wed, 30 Sep 2026 09:17:00 +07", "vi")).toBe("2026-09-30T02:17:00.000Z");
    expect(normalizeFeedDate("2026-10-04T10:00:00Z", "vi")).toBe("2026-10-04T10:00:00.000Z");
  });

  it("returns future dates unchanged; sync clamps them when storing", () => {
    expect(normalizeFeedDate("2026/10/05 13:14:24", "vi")).toBe("2026-10-05T06:14:24.000Z");
    expect(normalizeFeedDate("2026-10-09T10:00:00Z", "en")).toBe("2026-10-09T10:00:00.000Z");
    expect(clampToNowMs(NOW + 1, NOW)).toBe(NOW);
  });

  it("returns empty string for missing or invalid input", () => {
    expect(normalizeFeedDate(undefined, "vi")).toBe("");
    expect(normalizeFeedDate("", "vi")).toBe("");
    expect(normalizeFeedDate("hôm qua", "vi")).toBe("");
  });

  it("parses bongdaplus absolute and relative text", () => {
    expect(parseVietnameseDateText("18:20 ngày 03/10/2026", NOW)).toBe(Date.parse("2026-10-03T11:20:00.000Z"));
    expect(parseVietnameseDateText(" 15 giờ trước", NOW)).toBe(NOW - 15 * 3_600_000);
    expect(parseVietnameseDateText("20 phút trước", NOW)).toBe(NOW - 20 * 60_000);
    expect(parseVietnameseDateText("nonsense", NOW)).toBeNull();
  });
});
