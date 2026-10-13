import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `getNewsFromDB` used to split its `limit` into per-language quotas: 80/20
 * between a preferred language and the rest, or an even EN/VI pair when no
 * language was preferred. Neither side was ever topped up — a backfill pass had
 * been removed because it re-ran identical queries — so the day the Vietnamese
 * feeds were dropped, every quota had an empty half. `limit` 12 returned 2 on
 * the home page and half of `limit` everywhere else, with no error anywhere.
 *
 * Nothing covered this function at the time. These tests pin the property that
 * matters: a single-language corpus fills the limit.
 */
let rows: Record<string, unknown>[];
let lastLimit = 0;

vi.mock("../supabase-service", () => ({
  getServiceClient: () => {
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: () => builder,
      not: () => builder,
      neq: () => builder,
      order: () => builder,
      limit: (n: number) => {
        lastLimit = n;
        return Promise.resolve({ data: rows.slice(0, n), error: null });
      },
    };
    return { from: () => builder };
  },
}));

import { getNewsFromDB } from "../db";

/** A row shaped like the columns the query selects, relevant enough to survive filtering. */
const row = (i: number, language: "en" | "vi") => ({
  url: `https://www.bbc.co.uk/sport/football/liverpool-${i}`,
  title: `Liverpool story ${i} from Anfield`,
  snippet: "Liverpool and Anfield feature in this story about the Reds.",
  thumbnail: null,
  source: "bbc",
  language,
  category: "team-news",
  relevance: 10,
  published_at: new Date(Date.now() - i * 60_000).toISOString(),
  fetched_at: new Date().toISOString(),
  author: null,
  hero_image: null,
  word_count: 400,
  tags: null,
  title_vi: null,
  snippet_vi: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  lastLimit = 0;
  rows = Array.from({ length: 40 }, (_, i) => row(i, "en"));
});

describe("getNewsFromDB", () => {
  it("fills the limit from an English-only corpus", async () => {
    const articles = await getNewsFromDB(12);
    expect(articles).toHaveLength(12);
  });

  it("still fills it when a language is preferred that has no articles", async () => {
    // The home page asked for a Vietnamese-first mix; this returned 2 of 12.
    const articles = await getNewsFromDB(12, "vi");
    expect(articles).toHaveLength(12);
  });

  it("asks the database for the full limit, not a fraction of it", async () => {
    await getNewsFromDB(100);
    expect(lastLimit).toBe(100);
  });

  it("puts the preferred language first without dropping the rest", async () => {
    rows = [row(0, "en"), row(1, "vi"), row(2, "en"), row(3, "vi")];
    const articles = await getNewsFromDB(4, "vi");
    expect(articles).toHaveLength(4);
    expect(articles.slice(0, 2).every((a) => a.language === "vi")).toBe(true);
    expect(articles.slice(2).every((a) => a.language === "en")).toBe(true);
  });
});
