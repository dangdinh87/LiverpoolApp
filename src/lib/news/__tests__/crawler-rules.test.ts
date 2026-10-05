import { describe, expect, it, vi } from "vitest";
import { analyzeArticleRelevance } from "../relevance";
import { categorizeArticle } from "../categories";
import { deduplicateArticles, reachImageKey, reachSlugKey } from "../dedup";
import { fetchAllNews } from "../pipeline";
import { listSourceFailures } from "../sync";
import type { FeedAdapter } from "../adapters/base";
import type { NewsArticle } from "../types";

vi.mock("../enrichers/og-meta", () => ({ enrichArticleMeta: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../supabase-service", () => ({ getServiceClient: () => ({}) }));
vi.mock("@/lib/football", () => ({ getFixtures: async () => [] }));

const art = (o: Partial<NewsArticle>): NewsArticle => ({
  title: "t", link: "https://example.com/x", pubDate: new Date().toISOString(), contentSnippet: "", source: "bbc", language: "en", ...o,
});
const rel = (o: Partial<NewsArticle>) => analyzeArticleRelevance(art(o)).isRelevant;
const cat = (title: string, snippet = "") => categorizeArticle(art({ title, contentSnippet: snippet }));

describe("relevance (Oct 2026 audit)", () => {
  it("no longer trusts mirror / independent / men feeds on their own", () => {
    expect(rel({ source: "mirror", title: "Arsenal fans react to cup draw" })).toBe(false);
    expect(rel({ source: "independent", title: "Chelsea sign midfielder" })).toBe(false);
    expect(rel({ source: "men", title: "City star injured" })).toBe(false);
    expect(rel({ source: "mirror", title: "Liverpool beat Arsenal at Anfield" })).toBe(true);
  });
  it("does not let the 'v' of Vietnamese 'với' unlock Everton stories", () => {
    expect(rel({ source: "bongda", language: "vi", title: "Everton chia tay HLV, bán đấu giá tại Liverpool với giá 5 triệu" })).toBe(false);
    expect(rel({ source: "echo", title: "Liverpool v Everton: team news" })).toBe(true);
  });
  it("rejects a national-team report that only names Van Dijk", () => {
    expect(rel({ source: "bongda24h", language: "vi", title: "ĐT Hà Lan thoát thua nhờ Van Dijk" })).toBe(false);
    expect(rel({ source: "bongda24h", language: "vi", title: "Van Dijk chấn thương, Liverpool lo lắng", contentSnippet: "Tuyển Hà Lan" })).toBe(true);
  });
  it("rejects women's team items even from the official site, but not men's stories mentioning WSL", () => {
    expect(rel({ source: "lfc", title: "Gareth Taylor's reaction to Manchester United 1-0 Liverpool" })).toBe(false);
    expect(rel({ source: "lfc", title: "Liverpool fall to narrow defeat at Manchester United in WSL", contentSnippet: "Liverpool women lost in the WSL" })).toBe(false);
    expect(rel({ source: "lfc", title: "Iraola praises Gakpo after win", contentSnippet: "Gakpo's sister plays in the WSL." })).toBe(true);
  });
  it("lets unambiguous single-surname players clear the threshold", () => {
    expect(rel({ source: "bbc", title: "Gakpo joins injury list" })).toBe(true);
    expect(rel({ source: "sky", title: "Szoboszlai scores again" })).toBe(true);
    expect(rel({ source: "sky", title: "Konaté returns to training" })).toBe(true);
  });
});

describe("categories (real audit titles)", () => {
  it("reads scorelines from the title only", () => {
    expect(cat("Liverpool 3-1 Tottenham Hotspur: Carabao Cup third round")).toBe("match-report");
    expect(cat("Liverpool team news", "They beat Spurs 3-1 last year")).not.toBe("match-report");
  });
  it("ignores the snippet tail beyond ~200 chars", () => {
    expect(cat("Liverpool latest", `${"x ".repeat(120)} Salah ruled out`)).toBe("general");
  });
  it("transfer verbs need a transfer context", () => {
    expect(cat("How Iraola is moving Liverpool on from the Slot era")).toBe("general");
    expect(cat("Moving from Newcastle to Liverpool easy decision - Isak")).toBe("general");
    expect(cat("Ward appointed Liverpool's sporting director", "a departure of Hughes")).toBe("general");
    expect(cat("Cầu thủ rời Liverpool vào tháng 1")).toBe("transfer");
    expect(cat("Salah rời Anfield")).toBe("transfer");
    expect(cat("Nhiều ngôi sao rời sân tập sớm")).not.toBe("transfer");
  });
  it("puts injury before transfer", () => {
    expect(cat("Isak injury: Liverpool may sign cover in the transfer window")).toBe("injury");
  });
  it("Vietnamese previews are analysis, not match reports", () => {
    expect(cat("Nhận định Liverpool vs Fulham: Lữ đoàn đỏ thắng 2-0")).toBe("analysis");
    expect(cat("Dự đoán tỷ số Liverpool - Fulham hôm nay")).toBe("analysis");
    expect(cat("Soi kèo Liverpool vs Man City")).toBe("analysis");
  });
  it("avoids the known false positives", () => {
    expect(cat("Ward confirmed as sporting director")).not.toBe("team-news");
    expect(cat("Everton suffer setback in title race")).not.toBe("injury");
    expect(cat("The defender who could be 'young player of the season'")).not.toBe("opinion");
    expect(cat("The unexpected winner of the night")).toBe("general");
    expect(cat("Fans feed the pigeons outside Anfield")).toBe("general");
    expect(cat("Premier League: 10 things to look out for this weekend")).not.toBe("injury");
  });
});

describe("dedup", () => {
  const echo = "https://www.liverpoolecho.co.uk/sport/football/football-news/liverpool-56m-transfer-decision-make-34714692";
  const mirror = "https://www.mirror.co.uk/sport/football/news/liverpool-56m-transfer-decision-make-37732928";
  it("extracts Reach slug keys without the numeric id", () => {
    expect(reachSlugKey(echo)).toBe("liverpool-56m-transfer-decision-make");
    expect(reachSlugKey("https://www.bbc.com/sport/x-12345678")).toBe("");
  });
  it("drops Reach syndication by slug", () => {
    const out = deduplicateArticles([
      art({ link: echo, title: "Liverpool have £56m transfer decision to make" }),
      art({ link: mirror, title: "Totally different words here today" }),
    ]);
    expect(out).toHaveLength(1);
  });
  it("drops Reach syndication by shared image file and keeps a thumbnail", () => {
    const a = art({ link: "https://www.mirror.co.uk/a/one-story-111111111", title: "Alpha story headline words", thumbnail: undefined });
    const b = art({
      link: "https://www.liverpool.com/b/other-slug-222222222", title: "Zulu unrelated headline text",
      thumbnail: "https://i2-prod.liverpool.com/incoming/article1/ALTERNATES/s615b/0_GettyImages-2265551234.jpg",
    });
    const c = art({
      link: "https://www.mirror.co.uk/c/third-slug-333333333", title: "Mike another distinct title line",
      thumbnail: "https://i2-prod.mirror.co.uk/incoming/article9/ALTERNATES/s1200/0_GettyImages-2265551234.jpg",
    });
    expect(reachImageKey(b.thumbnail, b.link)).toBe(reachImageKey(c.thumbnail, c.link));
    const out = deduplicateArticles([a, b, c]);
    expect(out.map((x) => x.link)).toEqual([a.link, b.link]);
  });
  it("dedupes against recently stored titles but lets a stored URL through as an update", () => {
    const existing = [{ url: "https://a.com/stored", title: "Liverpool confirm Wirtz new contract at Anfield" }];
    expect(deduplicateArticles([art({ link: "https://b.com/new", title: "Liverpool confirm Wirtz new contract at Anfield" })], existing)).toHaveLength(0);
    expect(deduplicateArticles([art({ link: "https://a.com/stored/", title: "Liverpool confirm Wirtz new contract at Anfield" })], existing)).toHaveLength(1);
  });
});

describe("pipeline observability", () => {
  const adapter = (name: string, items: NewsArticle[], status?: FeedAdapter["status"]): FeedAdapter => ({
    name, status, fetch: vi.fn().mockResolvedValue(items),
  });
  it("carries per-source status and canonicalises links", async () => {
    const good = adapter("bbc", [art({ title: "Liverpool win again at Anfield", link: "https://www.bbc.co.uk/sport/a?at_medium=RSS&at_campaign=rss" })], { state: "ok" });
    const bad = adapter("tia", [], { state: "http_error", httpStatus: 403 });
    const slow = adapter("vietnamnet", [], { state: "timeout", error: "timed out" });
    const { articles, stats } = await fetchAllNews([good, bad, slow], 10);
    expect(articles[0].link).toBe("https://www.bbc.co.uk/sport/a");
    expect(stats.bbc).toMatchObject({ status: "ok", kept: 1 });
    expect(stats.tia).toMatchObject({ status: "http_error", httpStatus: 403 });
    expect(listSourceFailures(stats).map((f) => f.source).sort()).toEqual(["tia", "vietnamnet"]);
    expect(stats.bbc).not.toHaveProperty("thin");
  });
  it("records a rejected adapter as an error", async () => {
    const boom: FeedAdapter = { name: "x", fetch: vi.fn().mockRejectedValue(new Error("kaput")) };
    const { stats } = await fetchAllNews([boom], 5);
    expect(stats.x).toMatchObject({ failed: 1, status: "error", error: "kaput" });
  });
});

import { looksLikeJunkContent } from "../content-quality";
import type { ArticleContent } from "../types";

describe("looksLikeJunkContent", () => {
  const base = { title: "t", heroImage: undefined, images: [], readingTime: 1, isThinContent: false } as unknown as ArticleContent;
  it("flags a scraped page shell: many images, almost no sentences", () => {
    const img = (n: number) => Array.from({ length: n }, (_, i) => `https://x.test/${i}.jpg`);
    expect(looksLikeJunkContent({ ...base, paragraphs: ["Menu"], images: img(12) })).toBe(true);
    expect(looksLikeJunkContent({ ...base, paragraphs: ["One line."], htmlContent: "<div>" + "x".repeat(20_000) + "</div>" })).toBe(true);
  });
  it("keeps real articles, even photo-heavy ones", () => {
    const para = "A proper sentence about the match that is long enough to count as a paragraph.";
    expect(looksLikeJunkContent({ ...base, paragraphs: [para, para, para, para], images: Array.from({ length: 12 }, (_, i) => `https://x.test/${i}.jpg`) })).toBe(false);
  });
});
