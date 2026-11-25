import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NewsArticle } from "@/lib/news/types";

const mockGetNewsFromDB = vi.fn<() => Promise<NewsArticle[]>>();
const mockGetVideoItemsFromDB = vi.fn<() => Promise<NewsArticle[]>>();
const mockGetPodcastItemsFromDB = vi.fn<() => Promise<NewsArticle[]>>();
const mockGetSocialItemsFromDB = vi.fn<() => Promise<NewsArticle[]>>();

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
  setRequestLocale: vi.fn(),
}));

vi.mock("@/lib/news", () => ({
  getNewsFromDB: mockGetNewsFromDB,
  getVideoItemsFromDB: mockGetVideoItemsFromDB,
  getPodcastItemsFromDB: mockGetPodcastItemsFromDB,
  getSocialItemsFromDB: mockGetSocialItemsFromDB,
}));

vi.mock("@/lib/news/latest-digest", () => ({
  getCachedLatestDigest: vi.fn(async () => null),
  getDigestHeadline: vi.fn(() => ""),
}));

vi.mock("@/lib/news/story-clusters", () => ({
  clusterStories: vi.fn((articles: NewsArticle[]) =>
    articles.map((lead) => ({ lead, related: [] })),
  ),
}));

vi.mock("@/components/news/news-feed", () => ({ NewsFeed: () => null }));
vi.mock("@/components/news/video-strip", () => ({ VideoStrip: () => null }));
vi.mock("@/components/news/podcast-strip", () => ({ PodcastStrip: () => null }));
vi.mock("@/components/news/social-strip", () => ({ SocialStrip: () => null }));
vi.mock("@/components/news/digest-card", () => ({ DigestCard: () => null }));
vi.mock("@/components/news/new-since", () => ({ NewStoriesCount: () => null }));
vi.mock("@/components/news/news-text", () => ({ cleanTitle: (s: string) => s }));
vi.mock("@/components/ui/page-hero", () => ({ PageHero: () => null }));
vi.mock("@/components/ui/hub-links", () => ({
  PresetConnectedGrid: () => null,
  SectionSubNav: () => null,
}));
vi.mock("@/lib/seo", () => ({ makePageMeta: () => ({}) }));
vi.mock("@/lib/seo-breadcrumbs", () => ({
  buildLocalizedBreadcrumbJsonLd: vi.fn(async () => ({})),
}));
vi.mock("@/components/seo/json-ld", () => ({ JsonLd: () => null }));

const SAMPLE_ARTICLE: NewsArticle = {
  title: "Liverpool train ahead of Anfield fixture",
  link: "https://www.bbc.com/sport/football/liverpool-1",
  pubDate: "2026-11-24T12:00:00.000Z",
  contentSnippet: "Squad prepares at Kirkby.",
  source: "bbc",
  language: "en",
  category: "team-news",
};

const originalNextPhase = process.env.NEXT_PHASE;

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.NEXT_PHASE;
  mockGetVideoItemsFromDB.mockResolvedValue([]);
  mockGetPodcastItemsFromDB.mockResolvedValue([]);
  mockGetSocialItemsFromDB.mockResolvedValue([]);
});

afterEach(() => {
  if (originalNextPhase === undefined) delete process.env.NEXT_PHASE;
  else process.env.NEXT_PHASE = originalNextPhase;
});

describe("NewsPage ISR error guard", () => {
  it("rejects at runtime when getNewsFromDB returns [] so empty HTML is not cached in ISR", async () => {
    mockGetNewsFromDB.mockResolvedValue([]);
    const { default: NewsPage } = await import("../[locale]/news/page");

    await expect(
      NewsPage({ params: Promise.resolve({ locale: "en" }) }),
    ).rejects.toThrow(/not caching/);
  });

  it("falls back to [] only during production build (NEXT_PHASE=phase-production-build)", async () => {
    process.env.NEXT_PHASE = "phase-production-build";
    mockGetNewsFromDB.mockResolvedValue([]);
    const { default: NewsPage } = await import("../[locale]/news/page");

    await expect(
      NewsPage({ params: Promise.resolve({ locale: "en" }) }),
    ).resolves.toBeTruthy();
  });

  it("still renders cleanly when main news succeeds even if media strips reject", async () => {
    mockGetNewsFromDB.mockResolvedValue([SAMPLE_ARTICLE]);
    mockGetVideoItemsFromDB.mockRejectedValue(new Error("video db timeout"));
    mockGetPodcastItemsFromDB.mockRejectedValue(new Error("podcast db timeout"));
    mockGetSocialItemsFromDB.mockRejectedValue(new Error("social db timeout"));
    const { default: NewsPage } = await import("../[locale]/news/page");

    await expect(
      NewsPage({ params: Promise.resolve({ locale: "en" }) }),
    ).resolves.toBeTruthy();
  });
});
