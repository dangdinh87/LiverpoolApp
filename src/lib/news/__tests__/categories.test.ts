import { describe, it, expect } from "vitest";
import { categorizeArticle } from "../categories";
import type { NewsArticle } from "../types";

function makeArticle(title: string, snippet = ""): NewsArticle {
  return {
    title,
    link: "https://example.com/test",
    pubDate: new Date().toISOString(),
    contentSnippet: snippet,
    source: "bbc",
    language: "en",
  };
}

describe("categorizeArticle", () => {
  it("detects match reports (score pattern)", () => {
    expect(categorizeArticle(makeArticle("Liverpool 3-1 Man City"))).toBe("match-report");
    expect(categorizeArticle(makeArticle("Liverpool 2–0 Chelsea post-match"))).toBe("match-report");
  });

  it("detects match reports (keyword)", () => {
    expect(categorizeArticle(makeArticle("Match report: Liverpool dominate"))).toBe("match-report");
    expect(categorizeArticle(makeArticle("Post-match analysis and highlights"))).toBe("match-report");
  });

  it("detects transfers", () => {
    expect(categorizeArticle(makeArticle("Liverpool sign Zubimendi in record deal"))).toBe("transfer");
    expect(categorizeArticle(makeArticle("Salah transfer news: Saudi bid"))).toBe("transfer");
    expect(categorizeArticle(makeArticle("Liverpool target new signing"))).toBe("transfer");
  });

  it("detects injuries", () => {
    expect(categorizeArticle(makeArticle("Jota ruled out for six weeks"))).toBe("injury");
    expect(categorizeArticle(makeArticle("Injury update: hamstring problem"))).toBe("injury");
    expect(categorizeArticle(makeArticle("Van Dijk sidelined with knee issue"))).toBe("injury");
  });

  it("detects opinion/analysis", () => {
    expect(categorizeArticle(makeArticle("Opinion: Why Liverpool will win the league"))).toBe("opinion");
    expect(categorizeArticle(makeArticle("Tactical breakdown of Liverpool's system"))).toBe("opinion");
    expect(categorizeArticle(makeArticle("Player ratings from the weekend fixtures"))).toBe("opinion");
  });

  it("detects team news", () => {
    expect(categorizeArticle(makeArticle("Team news: Confirmed lineup vs Arsenal"))).toBe("team-news");
    expect(categorizeArticle(makeArticle("Starting XI revealed for Anfield clash"))).toBe("team-news");
    expect(categorizeArticle(makeArticle("Squad selection for Champions League"))).toBe("team-news");
  });

  it("detects analysis/preview", () => {
    expect(categorizeArticle(makeArticle("Preview: What to expect vs Real Madrid"))).toBe("analysis");
    expect(categorizeArticle(makeArticle("How Liverpool could line up"))).toBe("analysis");
  });

  it("falls back to general", () => {
    expect(categorizeArticle(makeArticle("Liverpool latest from the training ground"))).toBe("general");
    expect(categorizeArticle(makeArticle("Fans celebrate at Anfield"))).toBe("general");
  });

  it("checks both title and snippet", () => {
    expect(
      categorizeArticle(makeArticle("Liverpool news", "Salah is ruled out with a hamstring injury"))
    ).toBe("injury");
  });
});

describe("categorizeArticle word boundaries", () => {
  it("does not match English stems inside other words", () => {
    expect(categorizeArticle(makeArticle("Feel the heat at Anfield"))).toBe("general"); // "fee"
    expect(categorizeArticle(makeArticle("Liverpool's ideal XI for the season"))).toBe("general"); // "deal"
  });

  it("does not match Vietnamese syllables inside other words", () => {
    expect(categorizeArticle(makeArticle("Trời mưa tại Anfield trước giờ bóng lăn"))).not.toBe("transfer"); // "rời" in "trời"
    expect(categorizeArticle(makeArticle("Bán kết Cúp Liên đoàn Anh: Liverpool gặp Arsenal"))).not.toBe("transfer"); // "bán kết"
  });

  it("still matches Vietnamese keywords on their own", () => {
    expect(categorizeArticle(makeArticle("Liverpool bán Núñez với giá 60 triệu euro"))).toBe("transfer");
    expect(categorizeArticle(makeArticle("Salah rời Liverpool"))).toBe("transfer");
    expect(categorizeArticle(makeArticle("Chấn thương của Isak"))).toBe("injury");
  });

  it("handles decomposed (NFC-less) Vietnamese input", () => {
    expect(categorizeArticle(makeArticle("Salah rồi Liverpool".normalize("NFD")))).toBeDefined();
    expect(categorizeArticle(makeArticle("Chấn thương của Isak".normalize("NFD")))).toBe("injury");
  });

  it("does not treat formations or season years as scorelines", () => {
    expect(categorizeArticle(makeArticle("4-3-3 explained: Liverpool's shape"))).toBe("general");
    expect(categorizeArticle(makeArticle("2026-27 season preview"))).toBe("analysis");
    expect(categorizeArticle(makeArticle("Fixtures released on 04-10-2026"))).toBe("general");
  });

  it("still detects scorelines", () => {
    expect(categorizeArticle(makeArticle("Liverpool 2 - 1 Arsenal"))).toBe("match-report");
    expect(categorizeArticle(makeArticle("Chelsea 0–0 Liverpool"))).toBe("match-report");
  });
});
