import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Clock, ExternalLink, User } from "lucide-react";
import { scrapeArticle, getNewsFromDB, getArticleContentFromDB, getArticleByUrl } from "@/lib/news";
import { getHreflangAlternates, buildBreadcrumbJsonLd, buildNewsArticleJsonLd, getCanonical } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { getFixtures } from "@/lib/football";
import { formatMatchDayMonth, formatMatchTime } from "@/lib/format-match-date";
import type { NewsArticle } from "@/lib/news/types";
import type { Fixture } from "@/lib/types/football";
import {
  decodeArticleSlug,
  encodeArticleSlug,
  formatRelativeDate,
  isKnownNewsSourceUrl,
  SOURCE_CONFIG,
  type NewsSource,
} from "@/lib/news-config";
import { detectSource as detectArticleSource, isLinkOutOnlyUrl, VI_SOURCES } from "@/lib/news/source-detect";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildExcerpt } from "@/lib/news/excerpt";
import "@/components/news/article-reader.css";
import { ReadingProgress } from "@/components/news/reading-progress";
import { ReadTracker } from "@/components/news/read-tracker";
import { ArticleImageViewer } from "@/components/news/article-image-viewer";
import { ArticleSidebar } from "@/components/news/article-sidebar";
import { ArticleNextMatch } from "@/components/news/article-end-sections";
import { ArticleActions } from "@/components/news/article-actions";
import { ArticleFigures } from "@/components/news/article-figures";
import { ArticleTitle } from "@/components/news/article-header";
import { ArticleLinkOut } from "@/components/news/article-linkout";
import { RelatedArticles } from "@/components/news/related-articles";
import { TranslateProvider, TranslateHeader, TranslateBody } from "@/components/news/translate-button";
import { CommentSection } from "@/components/news/comment-section";
import { assessReadability, cleanSnippet, cleanTitle, filterJunk, imageKey, isHttpUrl, pickTitle } from "@/components/news/news-text";

export const revalidate = 600; // 10 minutes

// Empty list = nothing prerendered at build, each path is rendered on first
// request and then cached for `revalidate` (without it the route renders per request).
export async function generateStaticParams() {
  return [];
}

function formatPublishDate(dateStr: string, source: string): { relative: string; absolute: string } {
  const lang = VI_SOURCES.has(source) ? "vi" : "en";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return { relative: "", absolute: "" };
  // Fixed Vietnam zone via the shared helper: toLocaleDateString without timeZone used the
  // runtime zone (UTC on Vercel), so times disagreed with the VN times shown elsewhere.
  const absolute = `${formatMatchDayMonth(date, lang, true)} · ${formatMatchTime(date)}`;
  return { relative: formatRelativeDate(dateStr, lang), absolute };
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
  const { slug } = await params;
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
    alternates: getHreflangAlternates(articlePath),
    openGraph: {
      type: "article",
      title,
      description,
      images,
      ...(content.publishedAt && { publishedTime: content.publishedAt }),
      ...(content.author && { authors: [content.author] }),
      siteName: "Liverpool FC Việt Nam",
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
  const url = decodeArticleSlug(slug);
  // Legacy base64 slugs decode to any URL; only news sources are articles.
  if (!url || !isKnownNewsSourceUrl(url)) notFound();

  const dbContent = await getArticleContentFromDB(url);
  const [content, allArticles, fixtures, t, tSidebar] = await Promise.all([
    dbContent ? Promise.resolve(dbContent) : scrapeArticle(url),
    getNewsFromDB(100, undefined, { skipSync: true }),
    getFixtures(),
    getTranslations("News.article"),
    getTranslations("News.sidebar"),
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
        source={source}
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
        source={source}
        sourceName={sourceName}
      />
    );
  }

  const isEnglishArticle = !VI_SOURCES.has(source);
  // One strip of four, not two stacked strips of ten (a wall of thumbnails under every article).
  const related = getRelatedArticles(url, title, allArticles, source, 4, imageKey(content.heroImage));
  // Older stored extractions have no date of their own; the feed row usually does.
  const shownAt = content.publishedAt || listed?.pubDate;
  const publishDate = shownAt ? formatPublishDate(shownAt, source) : null;
  const articleSlugUrl = `/news/${encodeArticleSlug(url)}`;
  const canonicalPath = `/news/${slug.join("/")}`;
  const heroImage = isHttpUrl(content.heroImage) ? content.heroImage : undefined;
  // Only ever render (or hand to translation) the same short excerpt a Google
  // News preview would show — a full reproduction of someone else's article is
  // itself an unlicensed derivative work, on top of reproducing the original text.
  const { excerpt, truncated } = buildExcerpt(paragraphs);
  // Photos for the plain-text body; the extracted HTML already carries its own.
  // At most one photo per two excerpt paragraphs (6 max): a short excerpt must not become a wall of pictures.
  const bodyImages = content.images
    .filter((img) => imageKey(img) !== imageKey(content.heroImage))
    .slice(0, Math.max(1, Math.min(6, Math.floor(excerpt.length / 2))));
  const byline = content.author && !/^https?:/i.test(content.author) ? content.author : null;

  const meta = (
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-stadium-muted">
      {sourceCfg && (
        <span className={`px-2 py-1 font-barlow text-xs font-bold uppercase tracking-wider ${sourceCfg.color}`}>
          {sourceName}
        </span>
      )}
      {publishDate && (
        <span className="inline-flex items-center gap-1.5" title={publishDate.absolute}>
          <Clock className="size-3.5" aria-hidden />
          <span className="sm:hidden">{publishDate.relative}</span>
          <span className="hidden sm:inline">{publishDate.absolute}</span>
        </span>
      )}
      {content.readingTime ? <span>{tSidebar("minRead", { n: content.readingTime })}</span> : null}
      {byline && (
        <span className="inline-flex items-center gap-1.5">
          <User className="size-3.5" aria-hidden />
          {byline}
        </span>
      )}
    </div>
  );

  const actions = (
    <div className="mt-6 max-w-xl">
      <ArticleActions
        articleUrl={url}
        articleTitle={title}
        articleSlugUrl={articleSlugUrl}
        articleMeta={{
          snippet: content.description,
          thumbnail: content.heroImage,
          source,
          language: isEnglishArticle ? "en" : "vi",
          publishedAt: content.publishedAt,
        }}
      />
    </div>
  );

  const footer = (
    <>
      {(readability === "thin" || truncated) && (
        <div className="surface mt-10 flex flex-col gap-4 p-5">
          <p className="text-[15px] leading-relaxed text-stadium-muted">
            {readability === "thin" ? t("thinContentMsg") : t("excerptMsg")}
          </p>
          {isHttpUrl(url) && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 bg-lfc-red px-6 font-barlow text-base font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-lfc-red-dark sm:self-start"
            >
              {t("readFullOn", { source: sourceName })}
              <ExternalLink className="size-4" aria-hidden />
            </a>
          )}
        </div>
      )}
      <div className="mt-10 flex flex-col gap-4 border-t border-[var(--line)] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-stadium-muted">
          {t.rich("sourcedFrom", {
            sourceName,
            source: (chunks) => (
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-brand underline underline-offset-2 hover:text-white">
                {chunks}
              </a>
            ),
          })}
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 border border-[var(--line-strong)] px-5 font-barlow text-sm font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:border-white/50"
        >
          {t("readOriginal")}
          <ExternalLink className="size-4" aria-hidden />
        </a>
      </div>
    </>
  );

  const layout = (header: React.ReactNode, body: React.ReactNode) => (
    <div className="page-container pb-16 pt-[calc(var(--header-h)+1rem)]">
      <Link
        href="/news"
        className="inline-flex min-h-11 items-center gap-2 font-barlow text-sm font-semibold uppercase tracking-[0.12em] text-stadium-muted transition-colors hover:text-white"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToNews")}
      </Link>

      <header className="reveal mt-2 max-w-4xl">
        {meta}
        {header}
      </header>
      {actions}

      {heroImage && (
        <div className="relative -mx-4 mt-6 aspect-video max-h-[480px] bg-[var(--surface-3)] sm:mx-0">
          <Image
            src={heroImage}
            alt={title}
            fill
            priority
            sizes="(max-width: 1152px) 100vw, 1152px"
            unoptimized
            referrerPolicy="no-referrer"
            className="object-cover"
          />
        </div>
      )}

      <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
        <div className="min-w-0">
          {body}
          {footer}
          <CommentSection articleUrl={url} />
        </div>
        <aside className="hidden lg:block">
          <ArticleSidebar source={source} sourceName={sourceName} sourceUrl={content.sourceUrl || url} nextMatch={nextMatch} />
        </aside>
      </div>

      <RelatedArticles articles={related} />
      {nextMatch && <ArticleNextMatch fixture={nextMatch} className="mt-12 lg:hidden" />}
    </div>
  );

  // Excerpt only — never the scraped htmlContent/full paragraphs, see
  // buildExcerpt() above for why.
  const plainBody = <ArticleFigures paragraphs={excerpt} images={bodyImages} />;

  return (
    <article className="min-h-screen">
      <ReadingProgress />
      <ReadTracker articleUrl={url} />
      <ArticleImageViewer />
      <JsonLd data={[
        buildBreadcrumbJsonLd([
          { name: "Home", url: getCanonical("/") },
          { name: "News", url: getCanonical("/news") },
          { name: title, url: getCanonical(canonicalPath) },
        ]),
        buildNewsArticleJsonLd({
          title,
          description: content.description || content.paragraphs[0]?.slice(0, 160) || "",
          url: getCanonical(canonicalPath),
          image: content.heroImage,
          author: content.author,
          publishedAt: content.publishedAt,
          sourceName: content.sourceName,
        }),
      ]} />

      {isEnglishArticle ? (
        // Translate keeps the excerpt and a Vietnamese version side by side.
        <TranslateProvider
          articleUrl={url}
          originalTitle={title}
          originalDescription={description}
          originalParagraphs={excerpt}
        >
          {layout(
            <TranslateHeader originalDescription={description} />,
            <TranslateBody images={bodyImages} />,
          )}
        </TranslateProvider>
      ) : (
        layout(
          <ArticleTitle title={title} description={description} />,
          <div id="article-body">{plainBody}</div>,
        )
      )}
    </article>
  );
}
