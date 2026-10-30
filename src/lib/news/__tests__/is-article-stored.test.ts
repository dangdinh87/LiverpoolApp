import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The article page skips the scrape only when this says `false`. During the
 * Supabase outage of 30/10/2026 a failed lookup read as "not stored" and every
 * article lost its body; a failure must come back as `null` instead.
 */
let answer: () => Promise<{ data: unknown[] | null; error: unknown }>;

vi.mock("react", () => ({ cache: (fn: unknown) => fn }));
vi.mock("../supabase-service", () => ({
  getServiceClient: () => {
    const builder = {
      select: () => builder,
      in: () => builder,
      limit: () => answer(),
    };
    return { from: () => builder };
  },
}));

import { isArticleStored } from "../db";

const URL = "https://www.liverpoolecho.co.uk/sport/football/football-news/x-34778727";

beforeEach(() => {
  answer = async () => ({ data: [], error: null });
});

describe("isArticleStored", () => {
  it("is true when the row exists", async () => {
    answer = async () => ({ data: [{ url: URL }], error: null });
    expect(await isArticleStored(URL)).toBe(true);
  });

  it("is false only when the DB answers with no row", async () => {
    expect(await isArticleStored(URL)).toBe(false);
  });

  it("is null when PostgREST returns an error (503, statement timeout)", async () => {
    answer = async () => ({ data: null, error: { code: "PGRST002", message: "Could not query the database" } });
    expect(await isArticleStored(URL)).toBeNull();
  });

  it("is null when the request itself fails (timeout, open circuit)", async () => {
    answer = async () => {
      throw new Error("Supabase request timed out");
    };
    expect(await isArticleStored(URL)).toBeNull();
  });
});
