import { describe, expect, it, vi } from "vitest";
import { dropStaleLiveBlogContent, isLiveBlog, liveBlogsWithNewHeadline } from "../live-blog";

// Titles and URLs as stored on 2026-10-11 (Liverpool v Man City) and 2026-10-17 (Brentford v Liverpool).
describe("isLiveBlog", () => {
  it("spots match and press-conference live blogs by title or URL", () => {
    expect(isLiveBlog("Brentford vs Liverpool LIVE - score, Keane Lewis-Potter goal, Dominik Szoboszlai injury", "https://www.liverpoolecho.co.uk/sport/football/football-news/brentford-liverpool-live-updates-32661234")).toBe(true);
    expect(isLiveBlog("Recap Liverpool vs Man City LIVE: Hostile Anfield 'cheat' taunts SILENCED by dominant City", "https://www.mirror.co.uk/sport/football/news/liverpool-man-city-live-score-37759400")).toBe(true);
    expect(isLiveBlog("Brentford vs. Liverpool live updates: Latest score, teams, analysis & more", "https://www.thisisanfield.com/2026/10/brentford-vs-liverpool-live-updates-latest-s")).toBe(true);
    expect(isLiveBlog("LASK 3-6 Liverpool – As it happened", "https://www.thisisanfield.com/2026/10/lask-vs-liverpool-live-updates-latest-score-teams-an")).toBe(true);
  });

  it("leaves ordinary articles alone, including how-to-watch pieces", () => {
    expect(isLiveBlog("Is Brentford vs Liverpool on TV today? Live stream and how to follow 3pm clash", "https://www.mirror.co.uk/sport/football/news/brentford-liverpool-tv-live-stream-37780001")).toBe(false);
    expect(isLiveBlog("Dominik Szoboszlai injury return ends in agony with early exit", "https://www.liverpool.com/liverpool-fc-news/features/dominik-szoboszlai-liverpool-injury-3480001")).toBe(false);
    expect(isLiveBlog("Olivier Giroud delivers verdict on Liverpool", "https://www.example.com/oliver-delivers")).toBe(false);
  });
});

describe("liveBlogsWithNewHeadline", () => {
  const url = "https://www.independent.co.uk/sport/football/liverpool-man-city-charges-verdict-live-stream-b2840000";

  it("flags a stored live blog whose headline moved on since it was scraped", () => {
    const rows = [{ url, title: "Liverpool vs Manchester City LIVE: Rayan Cherki adds third goal as City cruise to victory" }];
    const existing = new Map([[url, { title: "Liverpool vs Manchester City LIVE: Team news and build-up" }]]);
    expect(liveBlogsWithNewHeadline(rows, existing)).toEqual([url]);
  });

  it("ignores unchanged headlines, new rows and ordinary articles", () => {
    const same = { url, title: "Liverpool vs Manchester City LIVE: Team news and build-up" };
    const article = { url: "https://www.liverpool.com/a", title: "Szoboszlai injury update" };
    const existing = new Map<string, { title?: unknown }>([
      [url, { title: same.title }],
      [article.url, { title: "Szoboszlai injury blow" }],
    ]);
    expect(liveBlogsWithNewHeadline([same, article, { url: "https://www.echo.co.uk/new-live-1", title: "Brentford vs Liverpool LIVE" }], existing)).toEqual([]);
  });
});

describe("dropStaleLiveBlogContent", () => {
  const fakeClient = (error: { message: string } | null = null) => {
    const calls: { table: string; values: Record<string, unknown>; urls: string[] }[] = [];
    const client = {
      from: (table: string) => ({
        update: (values: Record<string, unknown>) => ({
          in: vi.fn(async (_col: string, urls: string[]) => {
            calls.push({ table, values, urls });
            return { error };
          }),
        }),
      }),
    };
    return { client, calls };
  };

  it("clears the cached body and translation so this run's scrape fetches it again", async () => {
    const { client, calls } = fakeClient();
    await expect(dropStaleLiveBlogContent(client, ["https://a/live-1"])).resolves.toBe(1);
    expect(calls).toEqual([
      { table: "articles", values: { content_en: null, content_vi: null, content_scraped_at: null }, urls: ["https://a/live-1"] },
    ]);
  });

  it("makes no request when nothing changed, and reports 0 on a DB error", async () => {
    const quiet = fakeClient();
    await expect(dropStaleLiveBlogContent(quiet.client, [])).resolves.toBe(0);
    expect(quiet.calls).toEqual([]);
    const failing = fakeClient({ message: "timeout" });
    await expect(dropStaleLiveBlogContent(failing.client, ["https://a/live-1"])).resolves.toBe(0);
  });
});
