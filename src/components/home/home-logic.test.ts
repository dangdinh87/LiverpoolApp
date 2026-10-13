import { describe, expect, it } from "vitest";
import type { NewsArticle } from "@/lib/news/types";
import type { Standing } from "@/lib/types/football";
import { cleanTitle, selectHomeNews } from "./news-utils";
import { pickStandingsWindow } from "./standings-window";

const art = (n: number, language: "vi" | "en", hoursAgo = n): NewsArticle => ({
  title: `t${n}`,
  link: `https://x/${n}`,
  pubDate: new Date(Date.UTC(2026, 9, 5) - hoursAgo * 3_600_000).toISOString(),
  contentSnippet: "",
  source: "lfc",
  language,
});

const table = (n: number, lfcRank: number): Standing[] =>
  Array.from({ length: n }, (_, i) => ({ rank: i + 1, team: { id: i + 1 === lfcRank ? 40 : 100 + i, name: "", logo: "" } }) as Standing);

describe("news-utils", () => {
  it("decodes entities and strips tags in titles", () => {
    expect(cleanTitle("Salah&#8217;s <b>goal</b> &amp; more&nbsp;now")).toBe("Salah’s goal & more now");
  });
  it("prefers the viewer language when fresh", () => {
    const list = [art(1, "en"), art(2, "vi"), art(3, "vi"), art(4, "vi"), art(5, "en")];
    const out = selectHomeNews(list, "vi", 4);
    expect(out.slice(0, 3).every((a) => a.language === "vi")).toBe(true);
  });
  it("returns empty for no articles", () => expect(selectHomeNews([], "vi")).toEqual([]));
});

describe("pickStandingsWindow", () => {
  it("centres Liverpool with two neighbours each side", () => {
    expect(pickStandingsWindow(table(20, 6)).map((s) => s.rank)).toEqual([4, 5, 6, 7, 8]);
  });
  it("clamps at the top and bottom", () => {
    expect(pickStandingsWindow(table(20, 1)).map((s) => s.rank)).toEqual([1, 2, 3, 4, 5]);
    expect(pickStandingsWindow(table(20, 20)).map((s) => s.rank)).toEqual([16, 17, 18, 19, 20]);
  });
  it("falls back to the top 5 without Liverpool", () => {
    expect(pickStandingsWindow(table(20, 99)).length).toBe(5);
  });
});

describe("selectHomeNews story deduplication", () => {
  /**
   * Seven homepage slots used to be able to hold three rewrites of one story.
   * Echo, liverpool.com and the Mirror are all Reach plc and syndicate within
   * the group, so the feed really does receive them; these are live headlines
   * from 12 Oct 2026.
   */
  const article = (source: string, title: string, hour: number) => ({
    link: `https://example.test/${source}/${hour}`,
    title,
    language: "en",
    pubDate: `2026-10-12T${String(hour).padStart(2, "0")}:00:00Z`,
    source,
    contentSnippet: "",
    category: "team-news",
    relevance: 10,
  }) as unknown as Parameters<typeof selectHomeNews>[0][number];

  it("shows one card per story, not one per outlet", () => {
    const sameStory = [
      article("echo", "Andoni Iraola offers Cody Gakpo and Alexander Isak Liverpool injury update", 12),
      article("liverpoolcom", "Andoni Iraola gives Alexander Isak and Cody Gakpo injury update as Liverpool wait", 11),
      article("anfieldindex", "Andoni Iraola confirms Alexander Isak and Cody Gakpo injury status before Man City", 10),
      article("guardian", "Police officer injured as 10 arrests made at tense Liverpool v Manchester City", 9),
    ];
    const out = selectHomeNews(sameStory, "en", 7);
    expect(out).toHaveLength(2);
    expect(new Set(out.map((a) => a.link)).size).toBe(out.length);
  });
});
