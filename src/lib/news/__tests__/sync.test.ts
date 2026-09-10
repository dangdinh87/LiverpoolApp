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
});
