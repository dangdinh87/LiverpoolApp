import { describe, it, expect, vi } from "vitest";
import { fetchAllNews } from "../pipeline";
import type { FeedAdapter } from "../adapters/base";
import type { NewsArticle } from "../types";

function makeArticle(overrides: Partial<NewsArticle>): NewsArticle {
  return {
    title: "Test article",
    link: "https://example.com/test",
    pubDate: new Date().toISOString(),
    contentSnippet: "Liverpool news content",
    source: "bbc",
    language: "en",
    ...overrides,
  };
}

function mockAdapter(name: string, articles: NewsArticle[]): FeedAdapter {
  return { name, fetch: vi.fn().mockResolvedValue(articles) };
}

function failingAdapter(name: string): FeedAdapter {
  return { name, fetch: vi.fn().mockRejectedValue(new Error("Network error")) };
}

// Mock OG meta enricher to avoid network calls
vi.mock("../enrichers/og-meta", () => ({
  enrichArticleMeta: vi.fn().mockResolvedValue(undefined),
}));

describe("fetchAllNews", () => {
  it("merges articles from multiple adapters", async () => {
    const a1 = mockAdapter("source-a", [
      makeArticle({ title: "Liverpool win", link: "https://a.com/1" }),
    ]);
    const a2 = mockAdapter("source-b", [
      makeArticle({ title: "Salah scores", link: "https://b.com/1" }),
    ]);
    const result = await fetchAllNews([a1, a2], 10);
    expect(result).toHaveLength(2);
  });

  it("handles adapter failures gracefully", async () => {
    const ok = mockAdapter("good", [
      makeArticle({ title: "Liverpool update", link: "https://ok.com/1" }),
    ]);
    const bad = failingAdapter("broken");
    const result = await fetchAllNews([ok, bad], 10);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Liverpool update");
  });

  it("deduplicates across adapters", async () => {
    const a1 = mockAdapter("src-a", [
      makeArticle({ title: "Same Liverpool story", link: "https://a.com/1" }),
    ]);
    const a2 = mockAdapter("src-b", [
      makeArticle({ title: "Same Liverpool story", link: "https://a.com/1" }),
    ]);
    const result = await fetchAllNews([a1, a2], 10);
    expect(result).toHaveLength(1);
  });

  it("assigns categories and scores to articles", async () => {
    const adapter = mockAdapter("test", [
      makeArticle({
        title: "Liverpool sign new player in transfer deal",
        link: "https://t.com/1",
      }),
    ]);
    const result = await fetchAllNews([adapter], 10);
    expect(result[0].category).toBe("transfer");
    expect(result[0].relevanceScore).toBeGreaterThan(0);
  });

  it("sorts by relevance (higher scored first)", async () => {
    const adapter = mockAdapter("test", [
      makeArticle({
        title: "Random football story",
        link: "https://t.com/1",
        source: "bongda",
        pubDate: new Date(Date.now() - 5 * 24 * 3600000).toISOString(),
      }),
      makeArticle({
        title: "Liverpool Salah Anfield LFC update",
        link: "https://t.com/2",
        source: "lfc",
        pubDate: new Date().toISOString(),
      }),
    ]);
    const result = await fetchAllNews([adapter], 10);
    expect(result[0].title).toContain("Liverpool Salah");
  });

  it("respects limit parameter", async () => {
    const titles = [
      "Liverpool beat Manchester City in thrilling encounter",
      "Salah contract extension announced officially today",
      "Anfield stadium expansion plans revealed by council",
      "Trent Alexander-Arnold wins young player award",
      "Darwin Nunez scores four goals against Bournemouth",
      "Cody Gakpo dazzles in Champions League quarter-final",
      "Diogo Jota returns from lengthy hamstring rehabilitation",
      "Alisson Becker makes incredible triple save sequence",
      "Dominik Szoboszlai masterclass in midfield domination",
      "Andrew Robertson delivers perfect crossing performance",
    ];
    const articles = titles.map((t, i) =>
      makeArticle({ title: t, link: `https://t.com/${i}` })
    );
    const adapter = mockAdapter("bulk", articles);
    const result = await fetchAllNews([adapter], 5);
    expect(result).toHaveLength(5);
  });

  it("returns empty array when all adapters fail", async () => {
    const result = await fetchAllNews(
      [failingAdapter("a"), failingAdapter("b")],
      10
    );
    expect(result).toEqual([]);
  });
});
