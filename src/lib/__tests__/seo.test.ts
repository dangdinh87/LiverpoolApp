import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock NEXT_PUBLIC_SITE_URL before importing seo module
vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.liverpoolfcvn.blog");

const {
  getCanonical,
  getHreflangAlternates,
  makePageMeta,
  buildBreadcrumbJsonLd,
  buildNewsArticleJsonLd,
  buildSportsEventJsonLd,
  buildPersonJsonLd,
  buildImageGalleryJsonLd,
  buildFaqJsonLd,
} = await import("../seo");

describe("getCanonical", () => {
  it("builds full URL from path", () => {
    expect(getCanonical("/squad")).toBe("https://www.liverpoolfcvn.blog/squad");
  });

  it("handles root path", () => {
    expect(getCanonical("/")).toBe("https://www.liverpoolfcvn.blog");
  });

  it("strips trailing slash", () => {
    expect(getCanonical("/news/")).toBe("https://www.liverpoolfcvn.blog/news");
  });
});

describe("getHreflangAlternates", () => {
  it("returns canonical + language alternates pointing to same URL", () => {
    const result = getHreflangAlternates("/squad");
    expect(result.canonical).toBe("https://www.liverpoolfcvn.blog/squad");
    expect(result.languages.vi).toBe("https://www.liverpoolfcvn.blog/squad");
    expect(result.languages.en).toBe("https://www.liverpoolfcvn.blog/squad");
    expect(result.languages["x-default"]).toBe("https://www.liverpoolfcvn.blog/squad");
  });
});

describe("makePageMeta", () => {
  it("returns OG + Twitter metadata (backward-compatible)", () => {
    const meta = makePageMeta("Test Title", "Test description");
    expect(meta.openGraph).toBeDefined();
    expect((meta.openGraph as Record<string, unknown>).title).toBe("Test Title");
    expect(meta.twitter).toBeDefined();
    expect((meta.twitter as Record<string, unknown>).card).toBe("summary_large_image");
  });

  it("adds canonical + hreflang when path provided", () => {
    const meta = makePageMeta("Title", "Desc", { path: "/squad" });
    expect(meta.alternates).toBeDefined();
    expect(meta.alternates!.canonical).toBe("https://www.liverpoolfcvn.blog/squad");
  });

  it("adds image to OG when provided", () => {
    const meta = makePageMeta("Title", "Desc", { image: "/hero.jpg" });
    expect((meta.openGraph as Record<string, unknown>).images).toEqual([{ url: "/hero.jpg" }]);
  });

  it("sets article type + publishedTime", () => {
    const meta = makePageMeta("Title", "Desc", {
      type: "article",
      publishedTime: "2026-03-15T00:00:00Z",
    });
    expect((meta.openGraph as Record<string, unknown>).type).toBe("article");
    expect((meta.openGraph as Record<string, unknown>).publishedTime).toBe("2026-03-15T00:00:00Z");
  });
});

describe("buildBreadcrumbJsonLd", () => {
  it("builds valid BreadcrumbList schema", () => {
    const result = buildBreadcrumbJsonLd([
      { name: "Home", url: "https://www.liverpoolfcvn.blog" },
      { name: "Squad", url: "https://www.liverpoolfcvn.blog/squad" },
    ]);
    expect(result["@context"]).toBe("https://schema.org");
    expect(result["@type"]).toBe("BreadcrumbList");
    expect(result.itemListElement).toHaveLength(2);
    expect(result.itemListElement[0].position).toBe(1);
    expect(result.itemListElement[1].name).toBe("Squad");
  });
});

describe("buildNewsArticleJsonLd", () => {
  it("builds valid NewsArticle schema with required fields", () => {
    const result = buildNewsArticleJsonLd({
      title: "Liverpool win PL",
      description: "Liverpool clinched the title",
      url: "https://www.liverpoolfcvn.blog/news/bbc/test",
    });
    expect(result["@type"]).toBe("NewsArticle");
    expect(result.headline).toBe("Liverpool win PL");
    expect(result.publisher["@type"]).toBe("Organization");
  });

  it("includes optional fields when provided", () => {
    const result = buildNewsArticleJsonLd({
      title: "Test",
      description: "Desc",
      url: "https://example.com",
      image: "https://example.com/img.jpg",
      publishedAt: "2026-03-15T00:00:00Z",
      sourceName: "BBC Sport",
    });
    expect(result.image).toEqual(["https://example.com/img.jpg"]);
    expect(result.datePublished).toBe("2026-03-15T00:00:00Z");
    expect(result.author.name).toBe("BBC Sport");
  });

  it("omits optional fields when not provided", () => {
    const result = buildNewsArticleJsonLd({
      title: "Test",
      description: "Desc",
      url: "https://example.com",
    });
    expect(result.image).toBeUndefined();
    expect(result.datePublished).toBeUndefined();
  });
});

describe("buildSportsEventJsonLd", () => {
  it("builds valid SportsEvent with teams", () => {
    const result = buildSportsEventJsonLd({
      name: "Liverpool vs Man City",
      startDate: "2026-03-20T15:00:00Z",
      homeTeam: "Liverpool",
      awayTeam: "Manchester City",
      venue: "Anfield",
      venueCity: "Liverpool",
      competition: "Premier League",
    });
    expect(result["@type"]).toBe("SportsEvent");
    expect(result.sport).toBe("Football");
    expect(result.competitor).toHaveLength(2);
    expect(result.location?.name).toBe("Anfield");
  });

  it("includes result when scores provided", () => {
    const result = buildSportsEventJsonLd({
      name: "Liverpool vs Man City",
      startDate: "2026-03-20T15:00:00Z",
      homeTeam: "Liverpool",
      awayTeam: "Manchester City",
      homeScore: 2,
      awayScore: 1,
    });
    expect(result.result).toBe("Liverpool 2 - 1 Manchester City");
  });

  it("omits result when scores are null", () => {
    const result = buildSportsEventJsonLd({
      name: "Liverpool vs Man City",
      startDate: "2026-03-20T15:00:00Z",
      homeTeam: "Liverpool",
      awayTeam: "Manchester City",
      homeScore: null,
      awayScore: null,
    });
    expect(result.result).toBeUndefined();
  });
});

describe("buildPersonJsonLd", () => {
  it("builds valid Person schema for a player", () => {
    const result = buildPersonJsonLd({
      name: "Mohamed Salah",
      birthDate: "1992-06-15",
      nationality: "Egypt",
      image: "https://example.com/salah.jpg",
      url: "https://www.liverpoolfcvn.blog/player/mohamed-salah",
      position: "forward",
    });
    expect(result["@type"]).toBe("Person");
    expect(result.name).toBe("Mohamed Salah");
    expect(result.memberOf.name).toBe("Liverpool FC");
    expect(result.nationality?.name).toBe("Egypt");
  });

  it("handles minimal input", () => {
    const result = buildPersonJsonLd({
      name: "Test Player",
      url: "https://example.com/player/test",
    });
    expect(result.name).toBe("Test Player");
    expect(result.birthDate).toBeUndefined();
    expect(result.nationality).toBeUndefined();
  });
});

describe("buildImageGalleryJsonLd", () => {
  it("builds ImageGallery schema with images", () => {
    const result = buildImageGalleryJsonLd([
      { src: "https://example.com/1.jpg", alt: "Photo 1", width: 800, height: 600 },
      { src: "https://example.com/2.jpg", alt: "Photo 2" },
    ]);
    expect(result["@type"]).toBe("ImageGallery");
    expect(result.image).toHaveLength(2);
    expect(result.image[0].contentUrl).toBe("https://example.com/1.jpg");
    expect(result.image[0].width).toBe(800);
    expect(result.image[1].width).toBeUndefined();
  });
});

describe("buildFaqJsonLd", () => {
  it("builds FAQPage schema with Q&A pairs", () => {
    const result = buildFaqJsonLd([
      { question: "When was LFC founded?", answer: "1892" },
      { question: "What is YNWA?", answer: "You'll Never Walk Alone" },
    ]);
    expect(result["@type"]).toBe("FAQPage");
    expect(result.mainEntity).toHaveLength(2);
    expect(result.mainEntity[0]["@type"]).toBe("Question");
    expect(result.mainEntity[0].acceptedAnswer.text).toBe("1892");
  });
});
