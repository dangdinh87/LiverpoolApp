import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryResult = { data: Record<string, unknown>[] | null; error: { message: string } | null };

let mockQuery: () => Promise<QueryResult>;

vi.mock("../supabase-service", () => ({
  getServiceClient: () => {
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: () => builder,
      not: () => builder,
      in: () => builder,
      order: () => builder,
      limit: () => mockQuery(),
    };
    return { from: () => builder };
  },
}));

import { getPodcastItemsFromDB, getSocialItemsFromDB, getVideoItemsFromDB } from "../db";

const sampleRow = (source: string) => ({
  url: `https://example.com/${source}/1`,
  title: `Item from ${source}`,
  snippet: "Liverpool update",
  thumbnail: null,
  source,
  language: "en",
  category: "general",
  relevance: 5,
  published_at: "2026-11-24T12:00:00.000Z",
  fetched_at: "2026-11-24T12:05:00.000Z",
  author: null,
  hero_image: null,
  word_count: null,
  tags: null,
  title_vi: null,
  snippet_vi: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("media DB readers (getVideoItemsFromDB, getPodcastItemsFromDB, getSocialItemsFromDB)", () => {
  it.each([
    ["getVideoItemsFromDB", getVideoItemsFromDB, "lfctv"],
    ["getPodcastItemsFromDB", getPodcastItemsFromDB, "pod-walkon"],
    ["getSocialItemsFromDB", getSocialItemsFromDB, "bsky-ornstein"],
  ])("%s returns mapped rows when Supabase succeeds", async (_name, reader, source) => {
    mockQuery = async () => ({ data: [sampleRow(source)], error: null });
    const items = await reader(6);
    expect(items).toHaveLength(1);
    expect(items[0].source).toBe(source);
  });

  it.each([
    ["getVideoItemsFromDB", getVideoItemsFromDB],
    ["getPodcastItemsFromDB", getPodcastItemsFromDB],
    ["getSocialItemsFromDB", getSocialItemsFromDB],
  ])("%s returns [] when Supabase legitimately returns 0 rows", async (_name, reader) => {
    mockQuery = async () => ({ data: [], error: null });
    await expect(reader(6)).resolves.toEqual([]);
  });

  it.each([
    ["getVideoItemsFromDB", getVideoItemsFromDB],
    ["getPodcastItemsFromDB", getPodcastItemsFromDB],
    ["getSocialItemsFromDB", getSocialItemsFromDB],
  ])("%s rejects when Supabase returns a query/gateway error", async (_name, reader) => {
    mockQuery = async () => ({ data: null, error: { message: "upstream request timeout" } });
    await expect(reader(6)).rejects.toMatchObject({ message: "upstream request timeout" });
  });

  it.each([
    ["getVideoItemsFromDB", getVideoItemsFromDB],
    ["getPodcastItemsFromDB", getPodcastItemsFromDB],
    ["getSocialItemsFromDB", getSocialItemsFromDB],
  ])("%s rejects on transport/timeout AbortError", async (_name, reader) => {
    mockQuery = async () => {
      throw new DOMException("Supabase request failed: timeout", "AbortError");
    };
    await expect(reader(6)).rejects.toMatchObject({ name: "AbortError" });
  });
});
