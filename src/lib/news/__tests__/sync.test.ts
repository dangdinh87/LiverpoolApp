import { describe, expect, it } from "vitest";
import { mergeArticleRowForUpsert } from "../sync";

describe("mergeArticleRowForUpsert", () => {
  it("preserves existing images when a later RSS sync has no thumbnail", () => {
    const merged = mergeArticleRowForUpsert(
      {
        url: "https://example.com/story",
        title: "Updated title",
        thumbnail: null,
        hero_image: null,
      },
      {
        id: "db-id",
        fts: "generated",
        url: "https://example.com/story",
        title: "Old title",
        thumbnail: "https://cdn.example.com/thumb.jpg",
        hero_image: "https://cdn.example.com/hero.jpg",
        fetched_at: "2026-05-18T00:00:00.000Z",
      },
      "2026-05-19T00:00:00.000Z"
    );

    expect(merged.thumbnail).toBe("https://cdn.example.com/thumb.jpg");
    expect(merged.hero_image).toBe("https://cdn.example.com/hero.jpg");
    expect(merged).not.toHaveProperty("id");
    expect(merged).not.toHaveProperty("fts");
  });

  it("uses a fresh incoming thumbnail before the existing one", () => {
    const merged = mergeArticleRowForUpsert(
      {
        url: "https://example.com/story",
        thumbnail: "https://cdn.example.com/new.jpg",
        hero_image: null,
      },
      {
        url: "https://example.com/story",
        thumbnail: "https://cdn.example.com/old.jpg",
        hero_image: "https://cdn.example.com/old-hero.jpg",
      },
      "2026-05-19T00:00:00.000Z"
    );

    expect(merged.thumbnail).toBe("https://cdn.example.com/new.jpg");
    expect(merged.hero_image).toBe("https://cdn.example.com/old-hero.jpg");
  });

  it("seeds defaults for new rows", () => {
    const merged = mergeArticleRowForUpsert(
      { url: "https://example.com/new-story" },
      undefined,
      "2026-05-19T00:00:00.000Z"
    );

    expect(merged.fetched_at).toBe("2026-05-19T00:00:00.000Z");
    expect(merged.is_active).toBe(true);
    expect(merged.read_count).toBe(0);
  });

  it("keeps the stored published_at when the incoming article had no date", () => {
    const merged = mergeArticleRowForUpsert(
      { url: "https://example.com/story", published_at: "2026-10-04T15:00:00.000Z" },
      { url: "https://example.com/story", published_at: "2026-10-03T08:00:00.000Z", fetched_at: "2026-10-03T08:00:00.000Z" },
      "2026-10-04T15:00:00.000Z",
      true
    );
    expect(merged.published_at).toBe("2026-10-03T08:00:00.000Z");
  });

  it("takes the incoming published_at when the article is dated", () => {
    const merged = mergeArticleRowForUpsert(
      { url: "https://example.com/story", published_at: "2026-10-04T09:00:00.000Z" },
      { url: "https://example.com/story", published_at: "2026-10-03T08:00:00.000Z" },
      "2026-10-04T15:00:00.000Z",
      false
    );
    expect(merged.published_at).toBe("2026-10-04T09:00:00.000Z");
  });

  it("uses the incoming published_at for an undated article that is new", () => {
    const merged = mergeArticleRowForUpsert(
      { url: "https://example.com/new", published_at: "2026-10-04T15:00:00.000Z" },
      undefined,
      "2026-10-04T15:00:00.000Z",
      true
    );
    expect(merged.published_at).toBe("2026-10-04T15:00:00.000Z");
  });

  it("gives new and existing rows the same keys, so a bulk upsert never writes NULLs", () => {
    // PostgREST bulk upsert sends the union of keys; a key missing on one row is
    // written as NULL. This hid 244/400 articles via is_active = NULL.
    const fresh = mergeArticleRowForUpsert({ url: "https://example.com/new", title: "New" }, undefined, "2026-10-04T00:00:00.000Z");
    const existing = mergeArticleRowForUpsert(
      { url: "https://example.com/old", title: "Old" },
      { url: "https://example.com/old", fetched_at: "2026-10-01T00:00:00.000Z", is_active: null, read_count: null },
      "2026-10-04T00:00:00.000Z",
    );
    expect(Object.keys(existing).sort()).toEqual(expect.arrayContaining(Object.keys(fresh).sort()));
    expect(existing.is_active).toBe(true);
    expect(existing.read_count).toBe(0);
  });

  it("keeps a soft-deleted row deleted and keeps its read count", () => {
    const merged = mergeArticleRowForUpsert(
      { url: "https://example.com/old", title: "Old" },
      { url: "https://example.com/old", is_active: false, read_count: 42 },
    );
    expect(merged.is_active).toBe(false);
    expect(merged.read_count).toBe(42);
  });
});
