import type { Metadata } from "next";
import Image from "next/image";
import { User } from "lucide-react";
import { scrapeArticle, getArticleContentFromDB, getArticleByUrl, getArticleEngagement } from "@/lib/news";
import { getCachedNewsFeed } from "@/lib/news/cached-feed";
import { getHreflangAlternates } from "@/lib/seo";
import { buildLocalizedBreadcrumbJsonLd } from "@/lib/seo-breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { getCachedFixtures } from "@/lib/football/cached-fixtures";
import { LocalPublishedTime } from "@/components/ui/local-time";
import type { NewsArticle } from "@/lib/news/types";
import type { Fixture } from "@/lib/types/football";
import {
  decodeArticleSlug,
  encodeArticleSlug,
  isKnownNewsSourceUrl,
  SOURCE_CONFIG,
  type NewsSource,
} from "@/lib/news-config";
import { detectSource as detectArticleSource, isLinkOutOnlyUrl, VI_SOURCES } from "@/lib/news/source-detect";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BRAND } from "@/lib/brand";
import { buildExcerpt } from "@/lib/news/excerpt";
import "@/components/news/article-reader.css";
import { ReadTracker } from "@/components/news/read-tracker";
import { ArticleSidebar } from "@/components/news/article-sidebar";
import { ArticleNextMatch } from "@/components/news/article-end-sections";
import { ArticleActions } from "@/components/news/article-actions";
import { ArticleTitle } from "@/components/news/article-header";
import { ArticleExcerpt, NewsBackLink, OriginalLinkButton, SourceBadge } from "@/components/news/article-parts";
import { ArticleLinkOut } from "@/components/news/article-linkout";
import { RelatedArticles } from "@/components/news/related-articles";
import { TranslatableExcerpt } from "@/components/news/translatable-excerpt";
import { CommentSection } from "@/components/news/comment-section";
import { assessReadability, cleanSnippet, cleanTitle, filterJunk, imageKey, isHttpUrl, pickTitle } from "@/components/news/news-text";

// 1 hour. The excerpt itself never changes, so this could be far longer — but
// the page now renders the like count, and revalidateTag refreshes the data
// cache behind it, not this HTML. An hour caps how stale that number can look
// to a signed-out reader (a signed-in one still fetches the live value).
export const revalidate = 3600;

// Empty list = nothing prerendered at build, each path is rendered on first
// request and then cached for `revalidate` (without it the route renders per request).
export async function generateStaticParams() {
  return [];
}

/** The instant, if it parses. The wall-clock rendering belongs to the client. */
function publishedInstant(dateStr: string): string | null {
  const date = new Date(dateStr);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// Improved keyword-based related articles with stopwords + diversity
const STOP_WORDS = new Set([
  "liverpool", "city", "club", "says", "news", "will", "that",
  "this", "from", "have", "been", "with", "they", "their", "about",
  "after", "could", "would", "make", "made", "premier", "league",
]);

function getRelatedArticles(
  currentUrl: string,
  currentTitle: string,
  all: NewsArticle[],
  currentSource?: string,
  count = 4,
  avoidImage?: string,
) {
  // Filter by same language: Vietnamese articles → only Vietnamese related, English → only English
  const isCurrentVi = currentSource ? VI_SOURCES.has(currentSource) : false;
  const sameLangArticles = all.filter((a) => {
    const artSource = detectArticleSource(a.link).id;
    return VI_SOURCES.has(artSource) === isCurrentVi;
  });

  const currentWords = new Set(
    currentTitle.toLowerCase().split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w)),
  );
  return sameLangArticles
    .filter((a) => a.link !== currentUrl)
    // A card showing the same picture as this article is the same story syndicated elsewhere.
    .filter((a) => !avoidImage || imageKey(a.thumbnail ?? a.heroImage) !== avoidImage)
    .map((a) => {
      const words = a.title.toLowerCase().split(/\s+/)
        .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
      const overlap = words.filter((w) => currentWords.has(w)).length;
      // Promote source diversity
      const sourcePenalty = a.source === currentSource ? -0.3 : 0;
      return { article: a, score: overlap + sourcePenalty };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((r) => r.article);
}

type Params = Promise<{ slug: string[]; locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const url = decodeArticleSlug(slug);
  // Unresolvable article pages still answer 200 (the status is sent before the
  // page body streams), so keep them out of the index explicitly.
  if (!url || !isKnownNewsSourceUrl(url)) return { title: "Article Not Found", robots: { index: false } };

  const content = await getArticleContentFromDB(url) ?? await scrapeArticle(url);
  if (!content) {
    // Source blocked us: the page shows the stored headline with a "read original" link.
    const listing = await getArticleByUrl(url);
    if (!listing) return { title: "Article Not Found", robots: { index: false } };
    return { title: cleanTitle(listing.title), robots: { index: false } };
  }

  const listing = await getArticleByUrl(url);
  const title = pickTitle(content.title, listing?.title, detectArticleSource(url).name);
  const description = content.description || content.paragraphs[0]?.slice(0, 160) || "";
  const images = content.heroImage ? [{ url: content.heroImage, width: 1200, height: 630 }] : [];

  const articlePath = `/news/${slug.join("/")}`;
  return {
    title,
    description,
    // Excerpt-only mirror of another publisher's story: readers can open it,
    // but it must not compete with the original in search (thin/scraped content).
    robots: { index: false, follow: true },
    alternates: getHreflangAlternates(articlePath, locale),
    openGraph: {
      type: "article",
      title,
      description,
      images,
      ...(content.publishedAt && { publishedTime: content.publishedAt }),
      ...(content.author && { authors: [content.author] }),
      siteName: BRAND.name,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(content.heroImage && { images: [content.heroImage] }),
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Params;
}) {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const uiLocale = locale === "vi" ? "vi" : "en";
  const url = decodeArticleSlug(slug);
  // Legacy base64 slugs decode to any URL; only news sources are articles.
  if (!url || !isKnownNewsSourceUrl(url)) notFound();

  const dbContent = await getArticleContentFromDB(url);
  const [content, allArticles, fixtures, engagement, t, tNews] = await Promise.all([
    dbContent ? Promise.resolve(dbContent) : scrapeArticle(url),
    // Shared across every article page instead of a 100-row query per render.
    getCachedNewsFeed(100),
    // Only used to name the next match. Shared, or every article page spends its
    // own Football-Data request (10/min on the free tier).
    getCachedFixtures(),
    // One shared snapshot covers every article, so this is ~2 queries per TTL
    // for the whole site rather than two per page view. See lib/news/engagement.
    getArticleEngagement(url),
    getTranslations("News.article"),
    getTranslations("News"),
  ]);

  const nextMatch: Fixture | null =
    [...fixtures]
      .filter((f) => f.fixture.status.short === "NS")
      .sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime())[0] ?? null;

  // isKnownNewsSourceUrl above and detectSource share one host table, so this is never "unknown".
  const source = detectArticleSource(url).id as NewsSource;
  const sourceCfg = SOURCE_CONFIG[source];
  // The newest-100 list misses older articles; look the single row up so a blocked
  // source still shows its real headline, summary and picture.
  const listed = allArticles.find((a) => a.link === url) ?? (await getArticleByUrl(url)) ?? undefined;
  // The table label wins: older stored rows carry the raw host ("www.espn.com") as sourceName.
  const sourceName = sourceCfg?.label || content?.sourceName || "";

  // Nothing extracted: still give the reader the headline we have and a way to the source.
  if (!content) {
    return (
      <ArticleLinkOut
        url={url}
        title={listed ? cleanTitle(listed.title) : undefined}
        lead={listed ? cleanSnippet(listed.contentSnippet, listed.title) ?? undefined : undefined}
        heroImage={listed?.thumbnail ?? listed?.heroImage}
        sourceName={sourceName}
      />
    );
  }

  const title = pickTitle(content.title, listed?.title, sourceCfg?.label);
  const description = content.description ? cleanSnippet(content.description) ?? undefined : undefined;
  const paragraphs = filterJunk(content.paragraphs);
  const hasVideo = !!content.videoUrl || !!content.htmlContent?.includes("article-video-player");
  const readability = isLinkOutOnlyUrl(url)
    ? "linkout"
    : assessReadability({
        paragraphs,
        hasVideo,
        imageCount: content.images.length,
        flaggedThin: content.isThinContent,
      });

  if (readability === "linkout") {
    return (
      <ArticleLinkOut
        url={url}
        title={title || undefined}
        lead={description ?? (paragraphs[0] || undefined)}
        heroImage={content.heroImage ?? listed?.thumbnail}
        sourceName={sourceName}
      />
    );
  }

  const isEnglishArticle = !VI_SOURCES.has(source);
  // One short list of four headlines, no pictures.
  const related = getRelatedArticles(url, title, allArticles, source, 4, imageKey(content.heroImage));
  // Older stored extractions have no date of their own; the feed row usually does.
  const shownAt = content.publishedAt || listed?.pubDate;
  const published = shownAt ? publishedInstant(shownAt) : null;
  const articleSlugUrl = `/news/${encodeArticleSlug(url)}`;
  const canonicalPath = `/news/${slug.join("/")}`;
  const heroImage = isHttpUrl(content.heroImage) ? content.heroImage : undefined;
  // Only ever render (or hand to translation) the same short excerpt a Google
  // News preview would show: a full reproduction of someone else's article is
  // itself an unlicensed derivative work, on top of reproducing the original text.
  // A page with (almost) no body text, such as a lone photo credit, falls back to
  // its description, capped the same way.
  const bodyChars = paragraphs.reduce((n, p) => n + p.length, 0);
  const excerptSource = bodyChars >= 120 || !description ? paragraphs : [description];
  const { excerpt, truncated } = buildExcerpt(excerptSource);
  const byline = content.author && !/^https?:/i.test(content.author) ? content.author : null;
  const ctaHint = readability === "thin" ? t("thinContentMsg") : truncated ? t("excerptMsg") : undefined;

  return (
    <article className="min-h-screen">
      <ReadTracker articleUrl={url} />
      {/* Breadcrumb only. This page is another publisher's story shown as an
          excerpt; NewsArticle markup here named this site as its publisher,
          which is the one claim the excerpt-only stance exists to avoid. */}
      <JsonLd data={await buildLocalizedBreadcrumbJsonLd(locale, [
        { name: tNews("title"), path: "/news" },
        { name: title, path: canonicalPath },
      ])} />

      <div className="page-container max-w-5xl pb-16 pt-[calc(var(--header-h)+1rem)]">
        <NewsBackLink label={t("backToNews")} />

        <div className="lg:mt-2 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
          <div className="min-w-0">
            <header className="reveal">
              <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-stadium-muted">
                <SourceBadge name={sourceName} />
                {published && (
                  <time dateTime={published}>
                    <LocalPublishedTime iso={published} locale={uiLocale} zoneLabel={t("viewerTime")} />
                  </time>
                )}
                {byline && (
                  <span className="inline-flex items-center gap-1.5">
                    <User className="size-3.5" aria-hidden />
                    {byline}
                  </span>
                )}
              </div>
              <ArticleTitle title={title} />
            </header>

            {excerpt.length > 0 && (
              <div className="mt-5 max-w-[42rem]">
                {isEnglishArticle ? (
                  <TranslatableExcerpt articleUrl={url} paragraphs={excerpt} label={t("excerptLabel")} />
                ) : (
                  <section>
                    <p className="section-label mb-3 text-stadium-muted">{t("excerptLabel")}</p>
                    <div id="article-body">
                      <ArticleExcerpt paragraphs={excerpt} />
                    </div>
                  </section>
                )}
              </div>
            )}

            <div className="mt-5 max-w-[42rem]">
              <OriginalLinkButton url={url} label={t("readOriginalOn", { source: sourceName })} hint={ctaHint} />
            </div>

            {/* After the excerpt and the button on purpose: the picture must not push them below the fold. */}
            {heroImage && (
              <div className="relative -mx-4 mt-8 aspect-[2/1] bg-[var(--surface-3)] sm:mx-0 sm:aspect-video">
                <Image
                  src={heroImage}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 720px"
                  unoptimized
                  referrerPolicy="no-referrer"
                  className="object-cover"
                />
              </div>
            )}

            <div className="mt-8 max-w-xl">
              <ArticleActions
                articleUrl={url}
                articleTitle={title}
                articleSlugUrl={articleSlugUrl}
                initialLikeCount={engagement.likes}
                articleMeta={{
                  snippet: content.description,
                  thumbnail: content.heroImage,
                  source,
                  language: isEnglishArticle ? "en" : "vi",
                  publishedAt: content.publishedAt,
                }}
              />
            </div>

            <p className="mt-8 max-w-[42rem] text-sm leading-relaxed text-stadium-muted">
              {t.rich("sourcedFrom", {
                sourceName,
                source: (chunks) => (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-brand underline underline-offset-2 hover:text-white">
                    {chunks}
                  </a>
                ),
              })}
            </p>

            <RelatedArticles articles={related} />
            <CommentSection articleUrl={url} initialCommentCount={engagement.comments} />
          </div>

          <aside className="hidden lg:block">
            <ArticleSidebar sourceName={sourceName} sourceUrl={content.sourceUrl || url} nextMatch={nextMatch} />
          </aside>
        </div>

        {nextMatch && <ArticleNextMatch fixture={nextMatch} className="mt-12 lg:hidden" />}
      </div>
    </article>
  );
}
