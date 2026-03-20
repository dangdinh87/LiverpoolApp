"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock, User, BookOpen } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { SOURCE_CONFIG, type NewsSource } from "@/lib/news-config";
import { getArticleUrl } from "@/lib/news-config";

import { ArticleActions } from "./article-actions";
import type { Fixture } from "@/lib/types/football";
import type { NewsArticle } from "@/lib/news/types";
import type { ReactNode } from "react";

interface ArticleSidebarProps {
  source: NewsSource;
  sourceName: string;
  sourceUrl: string;
  author?: string;
  publishDate?: { relative: string; absolute: string };
  readingTime?: number;
  articleTitle: string;
  articleSlugUrl: string;
  nextMatch?: Fixture | null;
  articleMeta?: {
    snippet?: string;
    thumbnail?: string;
    language?: string;
    publishedAt?: string;
  };
  /** First related article for "Up Next" card */
  upNextArticle?: NewsArticle;
  /** TOC content slot — Phase 5 passes ArticleTOC here */
  tocContent?: ReactNode;
}

export function ArticleSidebar({
  source,
  sourceName,
  sourceUrl,
  author,
  publishDate,
  readingTime,
  articleTitle,
  articleSlugUrl,
  nextMatch,
  articleMeta,
  upNextArticle,
  tocContent,
}: ArticleSidebarProps) {
  const cfg = SOURCE_CONFIG[source];
  const t = useTranslations("News.sidebar");

  return (
    <div className="sticky top-20 space-y-4">
      {/* Merged metadata + actions card */}
      <div className="bg-stadium-surface border border-stadium-border p-5 space-y-4">
        {/* Source badge */}
        <div>
          <p className="font-barlow text-[10px] text-stadium-muted uppercase tracking-widest mb-2">
            {t("source")}
          </p>
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 font-barlow text-sm uppercase tracking-widest px-3 py-1.5 ${cfg.color} hover:brightness-125 transition-all`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {sourceName}
          </a>
        </div>

        {/* Separator + Metadata */}
        <div className="border-t border-stadium-border/50 pt-3 space-y-2.5">
          {author && (
            <div className="flex items-center gap-2.5 text-white/70">
              <User className="w-3.5 h-3.5 shrink-0" />
              <span className="font-inter text-sm">{author}</span>
            </div>
          )}
          {publishDate && (
            <div className="flex items-center gap-2.5 text-white/70" title={publishDate.absolute}>
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="font-inter text-sm">{publishDate.absolute}</span>
            </div>
          )}
          {readingTime && (
            <div className="flex items-center gap-2.5 text-white/70">
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="font-inter text-sm">{t("minRead", { n: readingTime })}</span>
            </div>
          )}
        </div>

        {/* Separator + Actions row */}
        <div className="border-t border-stadium-border/50 pt-3">
          <ArticleActions
            articleUrl={sourceUrl}
            articleTitle={articleTitle}
            articleSlugUrl={articleSlugUrl}
            articleMeta={{ source, ...articleMeta }}
          />
        </div>
      </div>

      {/* TOC slot — Phase 5 populates this */}
      {tocContent}

      {/* Up Next + Next Match */}
      {(upNextArticle || nextMatch) && (
        <UpNextCard
          upNextArticle={upNextArticle}
          nextMatch={nextMatch}
        />
      )}
    </div>
  );
}

// ─── Up Next card: featured related article + next match compact ───

const LFC_CREST = "/assets/lfc/crest.webp";

function UpNextCard({
  upNextArticle,
  nextMatch,
}: {
  upNextArticle?: NewsArticle;
  nextMatch?: Fixture | null;
}) {
  const t = useTranslations("News.sidebar");
  const tMatch = useTranslations("NextMatch");
  const locale = useLocale();

  return (
    <div className="bg-stadium-surface border border-stadium-border overflow-hidden">
      {/* Up Next article */}
      {upNextArticle && (
        <Link href={getArticleUrl(upNextArticle.link)} className="block group">
          <div className="p-4 pb-3">
            <p className="font-barlow text-[10px] text-stadium-muted uppercase tracking-widest mb-3">
              {t("upNext")}
            </p>
            {upNextArticle.thumbnail && (
              <div className="relative aspect-video w-full overflow-hidden mb-3">
                <Image
                  src={upNextArticle.thumbnail}
                  alt={upNextArticle.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="280px"
                  loading="lazy"
                  unoptimized
                />
              </div>
            )}
            <p className="font-inter text-sm font-semibold text-white group-hover:text-lfc-red transition-colors leading-snug line-clamp-2">
              {upNextArticle.title}
            </p>
          </div>
        </Link>
      )}

      {/* Next Match compact */}
      {nextMatch && (
        <CompactNextMatch
          fixture={nextMatch}
          hasArticleAbove={!!upNextArticle}
          locale={locale}
          t={tMatch}
        />
      )}
    </div>
  );
}

// ─── Compact next match (smaller than the old full NextMatchCard) ───

function CompactNextMatch({
  fixture,
  hasArticleAbove,
  locale,
  t,
}: {
  fixture: Fixture;
  hasArticleAbove: boolean;
  locale: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) {
  const { teams, fixture: f } = fixture;
  const date = new Date(f.date);
  const loc = locale === "vi" ? "vi-VN" : "en-GB";

  return (
    <Link
      href="/fixtures"
      className={`block p-4 hover:bg-stadium-surface2 transition-colors ${hasArticleAbove ? "border-t border-stadium-border/50" : ""}`}
    >
      <p className="font-barlow text-[10px] text-stadium-muted uppercase tracking-widest mb-3">
        {t("title")}
      </p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative w-7 h-7 shrink-0">
            <Image src={teams.home.logo || LFC_CREST} alt={teams.home.name} fill sizes="28px" className="object-contain" unoptimized />
          </div>
          <span className="font-inter text-xs text-white font-medium truncate">{teams.home.name}</span>
        </div>
        <div className="flex flex-col items-center px-1.5 shrink-0">
          <span className="font-bebas text-base text-stadium-muted">VS</span>
          <span className="font-barlow text-[10px] text-lfc-red font-semibold">
            {date.toLocaleDateString(loc, { day: "numeric", month: "short" })}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="font-inter text-xs text-white font-medium truncate text-right">{teams.away.name}</span>
          <div className="relative w-7 h-7 shrink-0">
            <Image src={teams.away.logo || LFC_CREST} alt={teams.away.name} fill sizes="28px" className="object-contain" unoptimized />
          </div>
        </div>
      </div>
    </Link>
  );
}
