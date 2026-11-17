import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, getClientIP, resetRateLimitStore } from "@/lib/rate-limit";

function mockReq(headers: Record<string, string>) {
  return {
    headers: new Headers(headers),
  };
}

describe("rate-limit", () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it("prefers cf-connecting-ip over spoofed x-forwarded-for", () => {
    const req = mockReq({
      "x-forwarded-for": "1.2.3.4, 198.51.100.7",
      "cf-connecting-ip": "203.0.113.99",
    });
    expect(getClientIP(req)).toBe("203.0.113.99");
  });

  it("uses the last x-forwarded-for hop when cf-connecting-ip and x-real-ip are absent", () => {
    const req = mockReq({
      "x-forwarded-for": "spoofed-client-ip, 198.51.100.42",
    });
    expect(getClientIP(req)).toBe("198.51.100.42");
  });

  it("enforces window limit and bounds store growth at capacity", () => {
    expect(checkRateLimit("ip:1", 2, 60_000)).toEqual({ allowed: true, remaining: 1 });
    expect(checkRateLimit("ip:1", 2, 60_000)).toEqual({ allowed: true, remaining: 0 });
    expect(checkRateLimit("ip:1", 2, 60_000)).toEqual({ allowed: false, remaining: 0 });

    // Flood over 2,000 unique keys and verify eviction keeps working without throwing
    for (let i = 0; i < 2_050; i++) {
      expect(checkRateLimit(`flood:${i}`, 5, 60_000).allowed).toBe(true);
    }
    // Oldest entry ("ip:1") was evicted once capacity was exceeded
    expect(checkRateLimit("ip:1", 2, 60_000)).toEqual({ allowed: true, remaining: 1 });
  });
});
