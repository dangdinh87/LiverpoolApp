import { describe, it, expect } from "vitest";
import { scoreArticle } from "../relevance";
import type { NewsArticle } from "../types";

function makeArticle(overrides: Partial<NewsArticle>): NewsArticle {
  return {
    title: "Test article",
    link: "https://example.com/test",
    pubDate: new Date().toISOString(),
    contentSnippet: "",
    source: "bbc",
    language: "en",
    ...overrides,
  };
}

describe("scoreArticle", () => {
  it("scores a fresh LFC-official article highest", () => {
    const score = scoreArticle(
      makeArticle({
        title: "Liverpool confirm Salah contract extension at Anfield",
        source: "lfc",
        pubDate: new Date().toISOString(), // just now
      })
    );
    // lfc=10 source, multiple keywords, fresh → high score
    expect(score).toBeGreaterThan(5);
  });

  it("scores old, irrelevant article low", () => {
    const old = new Date(Date.now() - 7 * 24 * 3600000).toISOString(); // 7 days ago
    const score = scoreArticle(
      makeArticle({
        title: "Arsenal win trophy",
        source: "bongda",
        pubDate: old,
      })
    );
    // bongda=4 source, no keywords, very old
    expect(score).toBeLessThan(2);
  });

  it("keyword score capped at 10", () => {
    // Stuff all keywords in
    const mega = makeArticle({
      title: "Liverpool Anfield LFC Salah Van Dijk Arne Slot Trent Nunez Gakpo Mac Allister Szoboszlai Jota Alisson Premier League Champions League",
      source: "lfc",
    });
    const score = scoreArticle(mega);
    // Even with all keywords, keyword component max = 10 * 0.3 = 3
    expect(score).toBeLessThanOrEqual(10);
  });

  it("prefers higher-priority source", () => {
    const base = { title: "Liverpool win", pubDate: new Date().toISOString() };
    const lfcScore = scoreArticle(makeArticle({ ...base, source: "lfc" }));
    const bongdaScore = scoreArticle(makeArticle({ ...base, source: "bongda" }));
    expect(lfcScore).toBeGreaterThan(bongdaScore);
  });

  it("prefers fresher articles", () => {
    const base = { title: "Liverpool news", source: "bbc" as const };
    const freshScore = scoreArticle(
      makeArticle({ ...base, pubDate: new Date().toISOString() })
    );
    const staleScore = scoreArticle(
      makeArticle({ ...base, pubDate: new Date(Date.now() - 48 * 3600000).toISOString() })
    );
    expect(freshScore).toBeGreaterThan(staleScore);
  });
});
