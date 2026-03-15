import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Newspaper } from "lucide-react";
import { scrapeArticle, getNewsFromDB } from "@/lib/news";
import { getHreflangAlternates } from "@/lib/seo";
import { getFixtures } from "@/lib/football";
import type { NewsArticle } from "@/lib/news/types";
import type { Fixture } from "@/lib/types/football";
import {
  decodeArticleSlug,
  encodeArticleSlug,
  formatRelativeDate,
  type NewsSource,
} from "@/lib/news-config";
import { detectSource as detectArticleSource, VI_SOURCES } from "@/lib/news/source-detect";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ReadingProgress } from "@/components/news/reading-progress";
import { ReadTracker } from "@/components/news/read-tracker";
import { ArticleImageViewer } from "@/components/news/article-image-viewer";
import { ArticleSidebar } from "@/components/news/article-sidebar";
import { RelatedArticles } from "@/components/news/related-articles";
import { TranslateProvider, TranslateHeader, TranslateBody } from "@/components/news/translate-button";
import { CommentSection } from "@/components/news/comment-section";

export const dynamic = "force-dynamic";

function formatPublishDate(dateStr: string, source: NewsSource): { relative: string; absolute: string } {
  const lang = VI_SOURCES.has(source) ? "vi" : "en";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return { relative: "", absolute: "" };
  const absolute = date.toLocaleDateString(lang === "vi" ? "vi-VN" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
  currentSource?: NewsSource,
  count = 6,
) {
  const currentWords = new Set(
    currentTitle.toLowerCase().split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w)),
  );
  return all
    .filter((a) => a.link !== currentUrl)
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

type Params = Promise<{ slug: string[] }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const url = decodeArticleSlug(slug);
  if (!url) return { title: "Article Not Found" };

  const content = await scrapeArticle(url);
  if (!content) return { title: "Article Not Found" };

  const description = content.description || content.paragraphs[0]?.slice(0, 160) || "";
  const images = content.heroImage ? [{ url: content.heroImage, width: 1200, height: 630 }] : [];

  const articlePath = `/news/${slug.join("/")}`;
  return {
    title: content.title,
    description,
    alternates: getHreflangAlternates(articlePath),
    openGraph: {
      type: "article",
      title: content.title,
      description,
      images,
      ...(content.publishedAt && { publishedTime: content.publishedAt }),
      ...(content.author && { authors: [content.author] }),
      siteName: "Liverpool FC Việt Nam",
    },
    twitter: {
      card: "summary_large_image",
      title: content.title,
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
  const { slug } = await params;
  const url = decodeArticleSlug(slug);
  if (!url) notFound();

  const [content, allArticles, fixtures, t] = await Promise.all([
    scrapeArticle(url),
    getNewsFromDB(100),
    getFixtures(),
    getTranslations("News.article"),
  ]);

  const nextMatch: Fixture | null =
    [...fixtures]
      .filter((f) => f.fixture.status.short === "NS")
      .sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime())[0] ?? null;

  if (!content || content.paragraphs.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <Newspaper className="w-16 h-16 text-stadium-muted mb-6" />
        <h1 className="font-bebas text-4xl text-white mb-3">
          {t("contentUnavailable")}
        </h1>
        <p className="font-inter text-stadium-muted text-sm mb-6 text-center max-w-md">
          {t("contentUnavailableDesc")}
        </p>
        <div className="flex gap-3">
          <Link
            href="/news"
            className="font-barlow text-sm text-white bg-stadium-surface border border-stadium-border px-4 py-2 hover:border-lfc-red/40 transition-colors"
          >
            ← {t("backToNews")}
          </Link>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-barlow text-sm text-white bg-lfc-red px-4 py-2 hover:bg-lfc-red/80 transition-colors flex items-center gap-2"
          >
            {t("readOriginal")} <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  const source = detectArticleSource(url).id;
  const isEnglishArticle = !VI_SOURCES.has(source);
  const related = getRelatedArticles(url, content.title, allArticles, source);
  const publishDate = content.publishedAt
    ? formatPublishDate(content.publishedAt, source)
    : null;
  const articleSlugUrl = `/news/${encodeArticleSlug(url)}`;

  const extraImages = content.htmlContent
    ? []
    : content.images.filter((img) => img !== content.heroImage).slice(0, 3);

  const renderExtras = () => (
    <>
      {/* Clickable image grid + lightbox for inline htmlContent images */}
      <ArticleImageViewer extraImages={extraImages} />
      {(content.isThinContent || content.paragraphs.length <= 2) && (
        <div className="mt-8 p-5 bg-stadium-surface border border-stadium-border text-center">
          <p className="font-inter text-sm text-white/60 mb-4">{t("thinContentMsg")}</p>
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-barlow text-sm text-white bg-lfc-red px-5 py-2.5 hover:bg-lfc-red/80 transition-colors uppercase tracking-wider font-semibold">
            {t("readFullOn", { source: content.sourceName })} <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
      <div className="mt-14 pt-6 border-t border-stadium-border/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="font-inter text-xs text-white/40">
            {t.rich("sourcedFrom", {
              sourceName: content.sourceName,
              source: (chunks) => (
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-lfc-red hover:underline">{chunks}</a>
              ),
            })}
          </p>
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-barlow text-sm text-white bg-lfc-red px-4 py-2 hover:bg-lfc-red/80 transition-colors uppercase tracking-wider font-semibold">
            {t("readOriginal")} <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </>
  );

  const renderSidebar = () => (
    <aside className="hidden lg:block">
      <ArticleSidebar
        source={source}
        sourceName={content.sourceName}
        sourceUrl={content.sourceUrl}
        author={content.author}
        publishDate={publishDate ?? undefined}
        readingTime={content.readingTime}
        articleTitle={content.title}
        articleSlugUrl={articleSlugUrl}
        nextMatch={nextMatch}
        articleMeta={{
          snippet: content.description,
          thumbnail: content.heroImage,
          language: VI_SOURCES.has(source) ? "vi" : "en",
          publishedAt: content.publishedAt,
        }}
      />
    </aside>
  );

  return (
    <div className="min-h-screen">
      <ReadingProgress />
      <ReadTracker articleUrl={url} />

      {/* Hero Image — full viewport */}
      {content.heroImage && (
        <div className="relative w-full h-[60vh] min-h-[400px] max-h-[600px]">
          <Image
            src={content.heroImage}
            alt={content.title}
            fill
            className="object-cover"
            sizes="100vw"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stadium-bg via-stadium-bg/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-stadium-bg to-transparent" />
        </div>
      )}

      {/* Article content — wrapped in TranslateProvider for EN articles */}
      {isEnglishArticle ? (
        <TranslateProvider
          articleUrl={url}
          originalTitle={content.title}
          originalDescription={content.description}
          originalParagraphs={content.paragraphs}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
            {/* Header area */}
            <div className={content.heroImage ? "-mt-40 relative z-10" : "pt-28"}>
              <Link
                href="/news"
                className="inline-flex items-center gap-2 font-barlow text-sm font-semibold uppercase tracking-wider text-white bg-white/15 backdrop-blur-md px-4 py-2 border border-white/20 hover:bg-lfc-red hover:border-lfc-red hover:text-white transition-all mb-8"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {t("backToNews")}
              </Link>
              {publishDate && (
                <div className="flex items-center gap-3 mb-4 lg:mb-3">
                  <span className="font-inter text-xs text-white/50 lg:hidden" title={publishDate.absolute}>
                    {publishDate.relative}
                  </span>
                </div>
              )}
              <TranslateHeader originalDescription={content.description} />
            </div>

            {/* 2-column grid */}
            <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-10">
              <div>
                <TranslateBody />
                {renderExtras()}
              </div>
              {renderSidebar()}
            </div>
            <CommentSection articleUrl={url} />
            <RelatedArticles articles={related} />
          </div>
        </TranslateProvider>
      ) : (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          {/* Header area */}
          <div className={content.heroImage ? "-mt-40 relative z-10" : "pt-28"}>
            <Link
              href="/news"
              className="inline-flex items-center gap-2 font-barlow text-sm text-white/70 hover:text-white bg-white/10 backdrop-blur-sm px-3.5 py-1.5 border border-white/10 hover:border-white/25 transition-all mb-8"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {t("backToNews")}
            </Link>
            {publishDate && (
              <div className="flex items-center gap-3 mb-4 lg:mb-3">
                <span className="font-inter text-xs text-white/50 lg:hidden" title={publishDate.absolute}>
                  {publishDate.relative}
                </span>
              </div>
            )}
            <h1 className="font-inter text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-[1.15] mb-6 max-w-4xl">
              {content.title}
            </h1>
            {content.description && (
              <blockquote className="font-inter text-lg sm:text-xl text-white/60 leading-relaxed mb-8 pl-5 border-l-4 border-lfc-red italic max-w-3xl">
                {content.description}
              </blockquote>
            )}
          </div>

          {/* 2-column grid */}
          <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-10">
            <div>
              {content.htmlContent ? (
                <div
                  id="article-body"
                  className="article-html-content space-y-6"
                  dangerouslySetInnerHTML={{ __html: content.htmlContent }}
                />
              ) : (
                <div id="article-body" className="space-y-6">
                  {content.paragraphs.map((p, i) => (
                    <p
                      key={i}
                      className={
                        i === 0
                          ? "font-inter text-lg text-white/90 leading-[1.9] font-medium"
                          : "font-inter text-[17px] text-white/80 leading-[1.85]"
                      }
                    >
                      {p}
                    </p>
                  ))}
                </div>
              )}
              {renderExtras()}
            </div>
            {renderSidebar()}
          </div>
          <CommentSection articleUrl={url} />
          <RelatedArticles articles={related} />
        </div>
      )}
    </div>
  );
}
