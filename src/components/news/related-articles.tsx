"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Newspaper, CheckCheck } from "lucide-react";
import type { NewsArticle } from "@/lib/news/types";
import {
  SOURCE_CONFIG,
  formatRelativeDate,
  getArticleUrl,
} from "@/lib/news-config";
import { getReadArticles } from "@/lib/news/read-history";

interface RelatedArticlesProps {
  articles: NewsArticle[];
}

export function RelatedArticles({ articles }: RelatedArticlesProps) {
  const [readSet, setReadSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    setReadSet(getReadArticles());
  }, []);

  if (articles.length === 0) return null;

  return (
    <div className="mt-14 pt-10 border-t border-stadium-border/50">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-6 bg-lfc-red" />
        <h2 className="font-bebas text-3xl text-white tracking-wider">
          Related News
        </h2>
      </div>
      {/* Vertical cards: image on top + text below */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {articles.map((article) => {
          const aCfg = SOURCE_CONFIG[article.source];
          const articleRead = readSet.has(article.link);
          return (
            <Link
              key={article.link}
              href={getArticleUrl(article.link)}
              className={`group block bg-stadium-surface border border-stadium-border overflow-hidden hover:border-lfc-red/40 transition-all duration-300 cursor-pointer ${articleRead ? "opacity-60" : ""}`}
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
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 bg-linear-to-br from-lfc-red/15 to-stadium-surface flex items-center justify-center">
                    <Newspaper className="w-6 h-6 text-stadium-muted" />
                  </div>
                )}
              </div>
              {/* Text content */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  {aCfg && (
                    <span
                      className={`font-barlow text-[10px] uppercase tracking-wider px-2 py-0.5 ${aCfg.color}`}
                    >
                      {aCfg.label}
                    </span>
                  )}
                  <span className="font-inter text-[11px] text-stadium-muted">
                    {formatRelativeDate(article.pubDate, article.language)}
                  </span>
                  {articleRead && (
                    <CheckCheck className="w-3 h-3 text-stadium-muted ml-auto shrink-0" />
                  )}
                </div>
                <p className="font-inter text-sm font-semibold text-white group-hover:text-lfc-red transition-colors leading-snug line-clamp-2">
                  {article.title}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
