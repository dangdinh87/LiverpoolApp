import { describe, expect, it } from "vitest";
import { cleanFeedText, cleanSnippet, decodeHtmlEntities, stripSnippetBoilerplate } from "../text";
import { matchesAnyKeyword } from "../keywords";
import { LFC_KEYWORDS } from "../config";
import { feedCategoryNames, shouldDropFeedItem } from "../feed-rules";
import { parseFeedDateMs, normalizeFeedDate } from "../date";

describe("entity decoding", () => {
  it("decodes thanhnien Latin-1 names", () => {
    expect(cleanFeedText("Liverpool v&igrave; sao tr&#7867;")).toBe("Liverpool vì sao trẻ");
  });
  it("decodes vietnamnet double-escaped apostrophes (loop until stable)", () => {
    expect(decodeHtmlEntities("Klopp&amp;apos;s side")).toBe("Klopp's side");
  });
  it("stops after 3 passes and never throws on odd input", () => {
    expect(typeof decodeHtmlEntities("&amp;amp;amp;amp;amp;")).toBe("string");
  });
  it("trims, collapses whitespace and NFC-normalises", () => {
    expect(cleanFeedText("  Chấn thương\n\n của  Isak ".normalize("NFD"))).toBe("Chấn thương của Isak".normalize("NFC"));
    expect(cleanFeedText(undefined)).toBe("");
  });
});

describe("snippet boilerplate", () => {
  it("removes the WordPress 'appeared first on' line", () => {
    expect(
      stripSnippetBoilerplate("The post Giovanni Leoni loan enquiry rejected – scouts to watch Liverpool ‘weekly’ appeared first on This Is Anfield.")
    ).toBe("");
    expect(stripSnippetBoilerplate("Real lede. The post Title appeared first on This Is Anfield.")).toBe("Real lede.");
  });
  it("removes the Anfield Index meta-description tail", () => {
    expect(
      cleanSnippet("£26m Liverpool star wanted by European giants - Report written on October 4, 2026 by Zachary Lewis. This article is about Featured, Liverpool FC News.")
    ).toBe("£26m Liverpool star wanted by European giants - Report");
  });
});

describe("keyword filter (whole words)", () => {
  it("does not match 'leoni' inside an image hash or 'endo' in 'tremendous'", () => {
    expect(matchesAnyKeyword("a1b2leoni9f image hash", LFC_KEYWORDS)).toBe(false);
    expect(matchesAnyKeyword("A tremendous day for the league", LFC_KEYWORDS)).toBe(false);
  });
  it("matches whole words incl. Vietnamese terms", () => {
    expect(matchesAnyKeyword("Giovanni Leoni transfer latest", LFC_KEYWORDS)).toBe(true);
    expect(matchesAnyKeyword("Lữ đoàn đỏ thắng đậm", LFC_KEYWORDS)).toBe(true);
    expect(matchesAnyKeyword("Wataru Endo returns", LFC_KEYWORDS)).toBe(true);
  });
});

describe("feed rules", () => {
  it("drops Sky video / liveblog items by category or URL", () => {
    expect(shouldDropFeedItem("sky", "https://www.skysports.com/watch/video/13593752/x", ["Video"])).toBe(true);
    expect(shouldDropFeedItem("sky", "https://www.skysports.com/football/live-blog/11669/1/x", ["Liveblog"])).toBe(true);
    expect(shouldDropFeedItem("sky", "https://www.skysports.com/football/news/11669/1/x", ["News Story"])).toBe(false);
  });
  it("drops Guardian live pages only", () => {
    expect(shouldDropFeedItem("guardian", "https://www.theguardian.com/football/live/2026/sep/20/x-live", [])).toBe(true);
    expect(shouldDropFeedItem("guardian", "https://www.theguardian.com/football/2026/sep/20/match-report", [])).toBe(false);
  });
  it("flattens rss-parser category objects", () => {
    expect(feedCategoryNames([{ _: "Liverpool", $: { domain: "x" } }, "Sport"])).toEqual(["Liverpool", "Sport"]);
  });
});

describe("feed date zones", () => {
  it("reads Sky BST as +01:00", () => {
    expect(new Date(parseFeedDateMs("Thu, 01 Oct 2026 22:00:00 BST")!).toISOString()).toBe("2026-10-01T21:00:00.000Z");
  });
  it("reads ESPN 'EST' as -04:00 in summer, -05:00 in winter", () => {
    expect(new Date(parseFeedDateMs("Sun, 4 Oct 2026 11:53:13 EST")!).toISOString()).toBe("2026-10-04T15:53:13.000Z");
    expect(new Date(parseFeedDateMs("Sun, 4 Jan 2026 11:53:13 EST")!).toISOString()).toBe("2026-01-04T16:53:13.000Z");
  });
  it("normalises +7:00 and keeps GMT", () => {
    expect(new Date(parseFeedDateMs("2026-10-04T10:00:00+7:00")!).toISOString()).toBe("2026-10-04T03:00:00.000Z");
    expect(normalizeFeedDate("Sat, 03 Oct 2026 05:00:51 GMT", "en")).toBe("2026-10-03T05:00:51.000Z");
  });
});
