import { describe, it, expect } from "vitest";
import { tokenize, jaccardSimilarity, deduplicateArticles } from "../dedup";
import type { NewsArticle } from "../types";

function makeArticle(overrides: Partial<NewsArticle>): NewsArticle {
  return {
    title: "Test article",
    link: "https://example.com/test",
    pubDate: new Date().toISOString(),
    contentSnippet: "Some content",
    source: "bbc",
    language: "en",
    ...overrides,
  };
}

describe("tokenize", () => {
  it("lowercases and removes punctuation", () => {
    const tokens = tokenize("Liverpool FC's NEW signing!");
    expect(tokens.has("liverpool")).toBe(true);
    expect(tokens.has("signing")).toBe(true);
    // "new" has 3 chars, passes length filter
    expect(tokens.has("new")).toBe(true);
  });

  it("filters stopwords and short words", () => {
    const tokens = tokenize("a is the on at to by or");
    expect(tokens.size).toBe(0);
  });

  it("filters tokens with 2 or fewer characters", () => {
    const tokens = tokenize("FC vs LFC go");
    // "fc"=2 chars filtered, "vs"=2 chars filtered, "lfc"=3 kept, "go"=2 filtered
    expect(tokens.has("lfc")).toBe(true);
    expect(tokens.has("fc")).toBe(false);
    expect(tokens.has("vs")).toBe(false);
  });
});

describe("jaccardSimilarity", () => {
  it("returns 1 for identical sets", () => {
    const s = new Set(["liverpool", "salah", "goal"]);
    expect(jaccardSimilarity(s, s)).toBe(1);
  });

  it("returns 0 for disjoint sets", () => {
    const a = new Set(["liverpool", "salah"]);
    const b = new Set(["arsenal", "saka"]);
    expect(jaccardSimilarity(a, b)).toBe(0);
  });

  it("returns 0 for two empty sets", () => {
    expect(jaccardSimilarity(new Set(), new Set())).toBe(0);
  });

  it("computes correct ratio for partial overlap", () => {
    const a = new Set(["liverpool", "salah", "goal"]);
    const b = new Set(["liverpool", "salah", "transfer"]);
    // intersection=2, union=4 → 0.5
    expect(jaccardSimilarity(a, b)).toBe(0.5);
  });
});

describe("deduplicateArticles", () => {
  it("removes exact URL duplicates", () => {
    const articles = [
      makeArticle({ title: "Article A", link: "https://bbc.com/article1" }),
      makeArticle({ title: "Article B", link: "https://bbc.com/article1" }),
    ];
    const result = deduplicateArticles(articles);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Article A");
  });

  it("normalizes URLs: strips www, protocol, trailing slash", () => {
    const articles = [
      makeArticle({ link: "https://www.bbc.com/sport/article/" }),
      makeArticle({ link: "http://bbc.com/sport/article" }),
    ];
    const result = deduplicateArticles(articles);
    expect(result).toHaveLength(1);
  });

  it("removes near-duplicate titles (Jaccard > 0.6)", () => {
    const articles = [
      makeArticle({
        title: "Liverpool sign new midfielder from Barcelona in record deal",
        link: "https://bbc.com/1",
      }),
      makeArticle({
        title: "Liverpool sign new midfielder from Barcelona record transfer",
        link: "https://sky.com/1",
      }),
    ];
    const result = deduplicateArticles(articles);
    expect(result).toHaveLength(1);
  });

  it("keeps articles with different titles", () => {
    const articles = [
      makeArticle({ title: "Salah scores hat-trick", link: "https://bbc.com/1" }),
      makeArticle({ title: "Van Dijk extends contract", link: "https://sky.com/1" }),
    ];
    const result = deduplicateArticles(articles);
    expect(result).toHaveLength(2);
  });

  it("handles empty input", () => {
    expect(deduplicateArticles([])).toEqual([]);
  });
});
