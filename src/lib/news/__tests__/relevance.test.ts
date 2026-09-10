import { describe, it, expect } from "vitest";
import { analyzeArticleRelevance, scoreArticle } from "../relevance";
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
        title: "Liverpool confirm Florian Wirtz contract extension at Anfield",
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

  it("rejects competitor-only articles from general Vietnamese feeds", () => {
    const analysis = analyzeArticleRelevance(
      makeArticle({
        title: "Man Utd thắng Nottingham Forest nhờ Bruno Fernandes",
        contentSnippet: "Quỷ đỏ leo lên nhóm đầu Ngoại hạng Anh.",
        source: "soha",
        language: "vi",
      })
    );
    expect(analysis.isRelevant).toBe(false);
    expect(analysis.score).toBe(-1);
  });

  it("rejects broad Sky Sports articles without Liverpool identity", () => {
    const analysis = analyzeArticleRelevance(
      makeArticle({
        title: "England rout New Zealand for 80 in T20 series win",
        contentSnippet:
          "England eased to a T20 series win after a ruthless bowling display.",
        source: "sky",
      })
    );
    expect(analysis.isRelevant).toBe(false);
    expect(analysis.score).toBe(-1);
  });

  it("accepts Sky Sports articles with Liverpool identity", () => {
    const analysis = analyzeArticleRelevance(
      makeArticle({
        title: "Liverpool transfer news: Reds target new midfielder",
        contentSnippet: "Andoni Iraola is preparing Liverpool for the summer window.",
        source: "sky",
      })
    );
    expect(analysis.isRelevant).toBe(true);
    expect(analysis.score).toBeGreaterThan(3);
  });

  it("accepts Vietnamese Liverpool identity terms", () => {
    const analysis = analyzeArticleRelevance(
      makeArticle({
        title: "Lữ đoàn đỏ nhận tin vui trước trận đại chiến",
        contentSnippet: "Andoni Iraola chuẩn bị đội hình mạnh nhất.",
        source: "bongda24h",
        language: "vi",
      })
    );
    expect(analysis.isRelevant).toBe(true);
    expect(analysis.signals.identity).toBeGreaterThan(5);
    expect(analysis.score).toBeGreaterThan(5);
  });

  it("accepts strong Liverpool player-only headlines", () => {
    const analysis = analyzeArticleRelevance(
      makeArticle({
        title: "Florian Wirtz agrees new contract after talks",
        source: "bbc",
      })
    );
    expect(analysis.isRelevant).toBe(true);
    expect(analysis.score).toBeGreaterThan(3);
  });

  it("penalizes competitor-heavy player stories without direct Liverpool identity", () => {
    const clean = analyzeArticleRelevance(
      makeArticle({
        title: "Florian Wirtz agrees new contract after talks",
        source: "bbc",
      })
    );
    const competitorHeavy = analyzeArticleRelevance(
      makeArticle({
        title: "Real Madrid make Florian Wirtz transfer plan",
        source: "bbc",
      })
    );
    expect(competitorHeavy.score).toBeLessThan(clean.score);
    expect(competitorHeavy.signals.penalty).toBeGreaterThan(0);
  });

  it("keyword score capped at 10", () => {
    // Stuff all keywords in
    const mega = makeArticle({
      title: "Liverpool Anfield LFC Florian Wirtz Van Dijk Andoni Iraola Bradley Barcola Ronald Araujo Gakpo Mac Allister Szoboszlai Elliott Alisson Premier League Champions League",
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
