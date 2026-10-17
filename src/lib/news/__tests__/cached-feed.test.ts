import { describe, expect, it, vi } from "vitest";

// Capture the options each unstable_cache call is created with.
const cacheOptions: { revalidate?: number; tags?: string[] }[] = [];
vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown, _key: unknown, options: { revalidate?: number; tags?: string[] }) => {
    cacheOptions.push(options);
    return fn;
  },
}));
vi.mock("../db", () => ({ getNewsFromDB: vi.fn(async () => []) }));

describe("getCachedNewsFeed (the article pages' related-articles snapshot)", () => {
  it("is not tagged 'news', so a sync does not mark every article page stale", async () => {
    await import("../cached-feed");
    expect(cacheOptions).toHaveLength(1);
    // The sync busts "news" for the home page and /news. Article pages are the most
    // numerous ISR entries; sharing that tag re-rendered each one a bot visited
    // after every sync — 287k ISR writes against 97k reads a month.
    expect(cacheOptions[0].tags ?? []).not.toContain("news");
    // Its own window must cover the article page's ISR window (1 h).
    expect(cacheOptions[0].revalidate).toBeGreaterThanOrEqual(3600);
  });
});
