import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import viMessages from "@/messages/vi.json";
import type { NewsArticle } from "@/lib/news/types";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt?: string }) => createElement("img", { src, alt: alt ?? "" }),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={`/vi${href}`} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/app/actions/news", () => ({
  loadMoreNews: vi.fn(async () => ({ articles: [], hasMore: false })),
}));

const GLOBAL_ARTICLES: NewsArticle[] = [
  {
    title: "Liverpool confirm squad training boost ahead of Anfield clash",
    link: "https://www.bbc.com/sport/football/articles/c1234567890o",
    pubDate: "2026-11-18T08:00:00.000Z",
    contentSnippet: "First-team players returned to Kirkby ahead of the weekend fixture.",
    source: "bbc",
    language: "en",
    category: "team-news",
  },
  {
    title: "Tactical preview: how Liverpool control midfield transitions",
    link: "https://www.theguardian.com/football/2026/nov/18/liverpool-midfield-analysis",
    pubDate: "2026-11-18T06:30:00.000Z",
    contentSnippet: "A closer look at Liverpool's pressing structure this campaign.",
    source: "guardian",
    language: "en",
    category: "analysis",
  },
];

describe("NewsFeed /vi/news fallback when only global English articles exist", () => {
  it("resolves effective language to 'all' when no Vietnamese feed articles exist", async () => {
    const { resolveEffectiveLang } = await import("../news-feed");
    expect(resolveEffectiveLang("vi", ["all", "en"])).toBe("all");
    expect(resolveEffectiveLang("vi", ["all", "vi", "en"])).toBe("vi");
    expect(resolveEffectiveLang("en", ["all", "en"])).toBe("en");
  });

  it("renders populated story cards on /vi/news and hides the dead language switcher", async () => {
    const { NewsFeed } = await import("../news-feed");
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="vi" timeZone="UTC" messages={viMessages as unknown as AbstractIntlMessages}>
        <NewsFeed
          localArticles={[]}
          globalArticles={GLOBAL_ARTICLES}
          locale="vi"
          nowMs={Date.parse("2026-11-18T09:00:00.000Z")}
        />
      </NextIntlClientProvider>,
    );

    expect(html).toContain("Liverpool confirm squad training boost ahead of Anfield clash");
    expect(html).toContain("Tactical preview: how Liverpool control midfield transitions");
    expect(html).toContain("/vi/news/bbc/");
    expect(html).toContain("/vi/news/guardian/");
    // Language segmented control has fewer than 3 options ("all" + "en"), so it stays hidden.
    expect(html).toMatch(/<div[^>]*role="group"[^>]*hidden=""/);
    // Never renders outage or empty-filter state when global English articles exist.
    expect(html).not.toContain(viMessages.News.feed.unavailableTitle);
    expect(html).not.toContain(viMessages.News.feed.noArticles);
  });
});
