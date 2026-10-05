import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Next refuses to start with more than 50 images.remotePatterns entries
// (adding image hosts one by one took it to 64 and crashed `next dev`).
describe("next.config images.remotePatterns", () => {
  const source = readFileSync(path.resolve(__dirname, "../../../../next.config.ts"), "utf8");
  const block = source.slice(source.indexOf("remotePatterns"));
  const hosts = [...block.matchAll(/hostname:\s*'([^']+)'/g)].map((m) => m[1]);

  it("stays at or under Next's limit of 50", () => {
    expect(hosts.length).toBeGreaterThan(0);
    expect(hosts.length).toBeLessThanOrEqual(50);
  });

  it("covers the news image hosts from the crawler audit", () => {
    const covered = (h: string) => hosts.some((p) => p === h || (p.startsWith("*.") && h.endsWith(p.slice(1))));
    for (const h of [
      "i2-prod.mirror.co.uk", "static.bongda24h.vn", "static.independent.co.uk", "i2-prod.dailystar.co.uk",
      "anfieldindex.com", "a1.espncdn.com", "a4.espncdn.com", "photo.znews.vn", "images2.thanhnien.vn",
      "sohanews.sohacdn.com", "cdn.tienphong.vn",
    ]) expect(covered(h), h).toBe(true);
  });
});
