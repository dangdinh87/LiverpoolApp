import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * This snapshot stopped being only cosmetic when the article page started
 * skipping the comment-list request on a zero count: a count that is wrong in
 * the "too low" direction now hides real comments instead of just printing the
 * wrong number. These tests pin the two ways that could happen — a stored URL
 * spelled differently from the page's own, and totals that silently exclude
 * older rows.
 */
let likeRows: { article_url: string }[];
let commentRows: { article_url: string }[];
let ordered: string[];

function table(rows: { article_url: string }[]) {
  const builder = {
    select: () => builder,
    order: (column: string) => {
      ordered.push(column);
      return builder;
    },
    // Awaiting the builder resolves it, the way postgrest-js behaves.
    limit: () => Promise.resolve({ data: rows, error: null }),
  };
  return builder;
}

vi.mock("../supabase-service", () => ({
  getServiceClient: () => ({
    from: (name: string) => table(name === "article_likes" ? likeRows : commentRows),
  }),
}));
// unstable_cache would otherwise memoise across tests in this file.
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

import { getArticleEngagement } from "../engagement";

const URL_CANONICAL = "https://www.bbc.co.uk/sport/football/article-1";

beforeEach(() => {
  vi.clearAllMocks();
  ordered = [];
  likeRows = [];
  commentRows = [];
});

describe("getArticleEngagement", () => {
  it("counts every row for the article, not one per article", async () => {
    likeRows = [
      { article_url: URL_CANONICAL },
      { article_url: URL_CANONICAL },
      { article_url: "https://www.bbc.co.uk/sport/football/article-2" },
    ];
    commentRows = [{ article_url: URL_CANONICAL }];

    expect(await getArticleEngagement(URL_CANONICAL)).toEqual({ likes: 2, comments: 1 });
  });

  it("finds rows stored under a legacy spelling of the URL", async () => {
    // Rows written before ingest settled on a canonical form still carry a
    // tracking parameter or a trailing slash the page's URL no longer has.
    commentRows = [{ article_url: `${URL_CANONICAL}?at_medium=RSS` }];

    const found = await getArticleEngagement(`${URL_CANONICAL}?at_medium=RSS`);
    expect(found.comments).toBe(1);
  });

  it("returns zeroes for an article nobody touched", async () => {
    likeRows = [{ article_url: "https://www.bbc.co.uk/sport/football/other" }];
    expect(await getArticleEngagement(URL_CANONICAL)).toEqual({ likes: 0, comments: 0 });
  });

  it("orders by date so the row cap drops the oldest, and applies no cutoff", async () => {
    await getArticleEngagement(URL_CANONICAL);
    // Two queries, both ordered; a `gte("created_at", …)` cutoff would have
    // made a count of zero mean "nothing recently" rather than "nothing".
    expect(ordered).toEqual(["created_at", "created_at"]);
  });
});
