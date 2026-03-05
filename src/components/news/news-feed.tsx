"use client";

import Image from "next/image";
import { Newspaper, Clock, ArrowUpRight } from "lucide-react";
import type { NewsArticle } from "@/lib/rss-parser";
import {
  SOURCE_CONFIG,
  formatRelativeDate,
  type NewsSource,
  type NewsLanguage,
} from "@/lib/news-config";

function ArticleBadge({
  source,
  language,
}: {
  source: NewsSource;
  language: NewsLanguage;
}) {
  const cfg = SOURCE_CONFIG[source];
  return (
    <span
      className={`inline-flex items-center gap-1 font-barlow text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${cfg.color}`}
    >
      {language === "vi" ? "🇻🇳" : "🇬🇧"} {cfg.label}
    </span>
  );
}

function ImageFallback({ className }: { className?: string }) {
  return (
    <div
      className={`w-full bg-gradient-to-br from-lfc-red/20 to-stadium-bg flex items-center justify-center ${className ?? ""}`}
    >
      <Newspaper className="w-8 h-8 text-stadium-muted" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card Variants
// ---------------------------------------------------------------------------

function HeroCard({ article }: { article: NewsArticle }) {
  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group block relative overflow-hidden rounded-sm"
    >
      {/* Image */}
      <div className="relative aspect-[21/9] w-full">
        {article.thumbnail ? (
          <Image
            src={article.thumbnail}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 896px"
            priority
          />
        ) : (
          <ImageFallback className="absolute inset-0 aspect-[21/9]" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      </div>

      {/* Content overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-2">
          <ArticleBadge source={article.source} language={article.language} />
          <span className="text-white/40 text-xs">·</span>
          <span className="font-inter text-xs text-white/60 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeDate(article.pubDate)}
          </span>
        </div>
        <h2 className="font-inter text-lg sm:text-2xl font-bold text-white leading-snug group-hover:text-lfc-gold transition-colors line-clamp-2">
          {article.title}
        </h2>
        {article.contentSnippet && (
          <p className="font-inter text-sm text-white/60 mt-2 line-clamp-2 hidden sm:block">
            {article.contentSnippet}
          </p>
        )}
      </div>
    </a>
  );
}

function MediumCard({ article }: { article: NewsArticle }) {
  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-stadium-surface border border-stadium-border rounded-sm overflow-hidden hover:border-lfc-red/40 transition-all duration-300 cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden">
        {article.thumbnail ? (
          <Image
            src={article.thumbnail}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            loading="lazy"
          />
        ) : (
          <ImageFallback className="absolute inset-0" />
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <ArticleBadge source={article.source} language={article.language} />
          <span className="text-stadium-border text-xs">·</span>
          <span className="font-inter text-xs text-stadium-muted flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeDate(article.pubDate)}
          </span>
        </div>
        <h3 className="font-inter text-sm font-semibold text-white group-hover:text-lfc-red transition-colors leading-snug line-clamp-3">
          {article.title}
        </h3>
      </div>
    </a>
  );
}

function CompactItem({ article }: { article: NewsArticle }) {
  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 py-3 border-b border-stadium-border/50 last:border-0 hover:bg-stadium-surface/50 transition-colors px-2 -mx-2 rounded-sm cursor-pointer"
    >
      <ArticleBadge source={article.source} language={article.language} />
      <p className="font-inter text-sm text-white group-hover:text-lfc-red transition-colors flex-1 line-clamp-1">
        {article.title}
      </p>
      <span className="font-inter text-xs text-stadium-muted whitespace-nowrap flex items-center gap-1">
        {formatRelativeDate(article.pubDate)}
        <ArrowUpRight className="w-3 h-3 text-stadium-muted group-hover:text-lfc-red transition-colors" />
      </span>
    </a>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface NewsFeedProps {
  articles: NewsArticle[];
}

export function NewsFeed({ articles }: NewsFeedProps) {
  if (articles.length === 0) {
    return (
      <div className="text-center py-20">
        <Newspaper className="w-12 h-12 text-stadium-muted mx-auto mb-4" />
        <p className="font-bebas text-3xl text-stadium-muted mb-2">
          News Unavailable
        </p>
        <p className="font-inter text-stadium-muted text-sm">
          Unable to load the news feed. Please try again later.
        </p>
      </div>
    );
  }

  const hero = articles[0];
  const medium = articles.slice(1, 7);
  const compact = articles.slice(7);

  return (
    <div className="space-y-8">
      {/* Hero Article */}
      {hero && <HeroCard article={hero} />}

      {/* Secondary Grid */}
      {medium.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {medium.map((article) => (
            <MediumCard key={article.link} article={article} />
          ))}
        </div>
      )}

      {/* Compact List */}
      {compact.length > 0 && (
        <div>
          <p className="font-barlow text-xs text-stadium-muted uppercase tracking-widest mb-3">
            More Stories
          </p>
          {compact.map((article) => (
            <CompactItem key={article.link} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
