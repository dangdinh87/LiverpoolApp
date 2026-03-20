"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Newspaper, CheckCheck } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { NewsArticle } from "@/lib/news/types";
import {
  SOURCE_CONFIG,
  formatRelativeDate,
  getArticleUrl,
  type NewsSource,
} from "@/lib/news-config";
import { getReadArticles } from "@/lib/news/read-history";

interface RelatedArticlesProps {
  articles: NewsArticle[];
  /** For "More from source" tab */
  source?: NewsSource;
  allArticles?: NewsArticle[];
  currentUrl?: string;
}

export function RelatedArticles({
  articles,
  source,
  allArticles,
  currentUrl,
}: RelatedArticlesProps) {
  const t = useTranslations("News.related");
  const locale = useLocale();
  const [readSet, setReadSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    setReadSet(getReadArticles());
  }, []);

  // Build "More from source" list
  const sourceArticles = source && allArticles && currentUrl
    ? allArticles.filter((a) => a.source === source && a.link !== currentUrl).slice(0, 4)
    : [];
  const sourceCfg = source ? SOURCE_CONFIG[source] : null;

  if (articles.length === 0 && sourceArticles.length === 0) return null;

  const hasTabs = sourceArticles.length > 0;

  const renderArticleCard = (article: NewsArticle, isFeatured = false) => {
    const aCfg = SOURCE_CONFIG[article.source];
    const isRead = readSet.has(article.link);
    return (
      <Link
        key={article.link}
        href={getArticleUrl(article.link)}
        className={`group block bg-stadium-surface border border-stadium-border overflow-hidden hover:border-lfc-red/40 transition-all duration-300 ${isRead ? "opacity-60" : ""} ${isFeatured ? "sm:col-span-2 lg:col-span-2 lg:row-span-2" : ""}`}
      >
        <div className={`relative w-full overflow-hidden ${isFeatured ? "aspect-[4/3]" : "aspect-video"}`}>
          {article.thumbnail ? (
            <Image
              src={article.thumbnail}
              alt={article.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes={isFeatured ? "(max-width: 640px) 100vw, 66vw" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
              loading="lazy"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 bg-linear-to-br from-lfc-red/15 to-stadium-surface flex items-center justify-center">
              <Newspaper className={`text-stadium-muted ${isFeatured ? "w-8 h-8" : "w-6 h-6"}`} />
            </div>
          )}
        </div>
        <div className={isFeatured ? "p-5" : "p-4"}>
          <div className="flex items-center gap-2 mb-2">
            {aCfg && (
              <span className={`font-barlow text-[10px] uppercase tracking-wider px-2 py-0.5 ${aCfg.color}`}>
                {aCfg.label}
              </span>
            )}
            <span className="font-inter text-[11px] text-stadium-muted">
              {formatRelativeDate(article.pubDate, article.language)}
            </span>
            {isRead && <CheckCheck className="w-3 h-3 text-stadium-muted ml-auto shrink-0" />}
          </div>
          <p className={`font-inter font-semibold text-white group-hover:text-lfc-red transition-colors leading-snug line-clamp-2 ${isFeatured ? "text-base" : "text-sm"}`}>
            {article.title}
          </p>
        </div>
      </Link>
    );
  };

  const relatedGrid = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {articles.map((article, i) => renderArticleCard(article, i === 0))}
    </div>
  );

  const sourceGrid = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {sourceArticles.map((article) => renderArticleCard(article))}
    </div>
  );

  return (
    <div className="mt-14 pt-10 border-t border-stadium-border/50">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-6 bg-lfc-red" />
        <h2 className="font-bebas text-3xl text-white tracking-wider">
          {t("title")}
        </h2>
      </div>

      {hasTabs ? (
        <Tabs defaultValue="related">
          <TabsList className="bg-stadium-surface border border-stadium-border mb-6 h-auto p-1">
            <TabsTrigger
              value="related"
              className="font-barlow text-xs uppercase tracking-wider data-[state=active]:bg-lfc-red data-[state=active]:text-white text-stadium-muted px-4 py-2"
            >
              {t("title")}
            </TabsTrigger>
            <TabsTrigger
              value="source"
              className="font-barlow text-xs uppercase tracking-wider data-[state=active]:bg-lfc-red data-[state=active]:text-white text-stadium-muted px-4 py-2"
            >
              {locale === "vi" ? "Thêm từ" : "More from"} {sourceCfg?.label}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="related" className="min-h-[200px]">
            {relatedGrid}
          </TabsContent>
          <TabsContent value="source" className="min-h-[200px]">
            {sourceGrid}
          </TabsContent>
        </Tabs>
      ) : (
        relatedGrid
      )}
    </div>
  );
}
