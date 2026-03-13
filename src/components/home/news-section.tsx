"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Newspaper, Clock } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import type { NewsArticle } from "@/lib/news/types";
import {
  SOURCE_CONFIG,
  formatRelativeDate,
  getArticleUrl,
  type NewsSource,
} from "@/lib/news-config";
import { getReadArticles } from "@/lib/news/read-history";
import { DigestCard } from "@/components/news/digest-card";
import type { DigestRecord } from "@/lib/news/digest";

interface NewsSectionProps {
  articles: NewsArticle[];
  digest?: DigestRecord | null;
}

// Consistent badge — no rounded, bold, matches news-feed.tsx style
function Badge({ source }: { source: NewsSource }) {
  const cfg = SOURCE_CONFIG[source];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center font-barlow font-bold text-[11px] uppercase tracking-wider px-1.5 py-0.5 ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

export function NewsSection({ articles, digest }: NewsSectionProps) {
  const t = useTranslations("News");
  const locale = useLocale();
  const [readSet, setReadSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    setReadSet(getReadArticles());
  }, []);

  // Filter by user locale on the client (avoids cookies() on server → enables ISR)
  const filtered = useMemo(() => {
    const lang = locale === "vi" ? "vi" : "en";
    const localNews = articles.filter((a) => a.language === lang);
    return localNews.length > 0 ? localNews.slice(0, 6) : articles.slice(0, 6);
  }, [articles, locale]);

  if (filtered.length === 0) return null;

  const featured = filtered[0];
  const rest = filtered.slice(1, 5);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="flex items-end justify-between mb-6"
      >
        <div>
          <p className="font-barlow text-lfc-red uppercase tracking-widest text-sm font-semibold mb-1">
            {t("tagline")}
          </p>
          <h2 className="font-bebas text-5xl md:text-6xl text-white tracking-wider drop-shadow-[0_0_20px_rgba(200,16,46,0.3)]">
            {t("title")}
          </h2>
        </div>
        <Link
          href="/news"
          className="hidden sm:flex items-center gap-1.5 font-barlow text-sm text-lfc-red hover:text-white uppercase tracking-wider font-semibold transition-colors"
        >
          {t("viewAll")}
        </Link>
      </motion.div>

      {/* AI Digest card — shown above news grid when available */}
      {digest && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35 }}
          className="mb-6"
        >
          <DigestCard
            date={digest.digest_date}
            title={digest.title}
            summary={digest.summary}
            articleCount={digest.article_count}
            generatedAt={digest.generated_at}
          />
        </motion.div>
      )}

      {/* Featured + Side list layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Featured card — 3 cols */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-3"
        >
          <Link
            href={getArticleUrl(featured.link)}
            className={`group block relative overflow-hidden cursor-pointer ${readSet.has(featured.link) ? "opacity-70" : ""}`}
          >
            <div className="relative aspect-16/10 w-full overflow-hidden">
              {featured.thumbnail ? (
                <Image
                  src={featured.thumbnail}
                  alt={featured.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  quality={85}
                  unoptimized
                />
              ) : (
                <div className="absolute inset-0 bg-linear-to-br from-lfc-red/20 to-stadium-bg flex items-center justify-center">
                  <Newspaper className="w-12 h-12 text-stadium-muted" />
                </div>
              )}
              <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300 group-hover:opacity-90" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-3">
                <Badge source={featured.source} />
                {formatRelativeDate(featured.pubDate, featured.language) && (
                  <span className="font-inter text-xs text-white/50 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatRelativeDate(featured.pubDate, featured.language)}
                  </span>
                )}
              </div>
              <h3 className="font-inter text-xl sm:text-2xl font-bold text-white leading-snug transition-colors duration-300 group-hover:text-lfc-gold line-clamp-2">
                {featured.title}
              </h3>
              {featured.contentSnippet && (
                <p className="font-inter text-sm text-white/50 mt-2 line-clamp-2 hidden sm:block">
                  {featured.contentSnippet}
                </p>
              )}
            </div>
          </Link>
        </motion.div>

        {/* Side list — 2 cols */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          {rest.map((article, i) => (
            <motion.div
              key={article.link}
              initial={{ opacity: 0, x: 10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
            >
              <Link
                href={getArticleUrl(article.link)}
                className={`group flex gap-3 p-3 bg-stadium-surface/80 border border-stadium-border/50 overflow-hidden cursor-pointer transition-all duration-300 hover:border-lfc-red/30 hover:bg-stadium-surface ${readSet.has(article.link) ? "opacity-60" : ""}`}
              >
                {/* Thumbnail */}
                <div className="relative w-24 h-20 shrink-0 overflow-hidden">
                  {article.thumbnail ? (
                    <Image
                      src={article.thumbnail}
                      alt={article.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      sizes="96px"
                      loading="lazy"
                      unoptimized
                    />
                  ) : (
                    <div className="absolute inset-0 bg-linear-to-br from-lfc-red/15 to-stadium-surface flex items-center justify-center">
                      <Newspaper className="w-5 h-5 text-stadium-muted" />
                    </div>
                  )}
                </div>
                {/* Content */}
                <div className="flex flex-col justify-center gap-1.5 flex-1 min-w-0">
                  <div className="flex items-center">
                    <Badge source={article.source} />
                  </div>
                  <p className="font-inter text-sm text-white font-medium leading-snug group-hover:text-lfc-gold transition-colors duration-200 line-clamp-2">
                    {article.title}
                  </p>
                  {formatRelativeDate(article.pubDate, article.language) && (
                    <span className="font-inter text-[11px] text-stadium-muted">
                      {formatRelativeDate(article.pubDate, article.language)}
                    </span>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Mobile "View All" link */}
      <div className="mt-6 text-center sm:hidden">
        <Link
          href="/news"
          className="inline-flex items-center gap-1.5 font-barlow text-sm text-lfc-red uppercase tracking-wider font-semibold"
        >
          {t("viewAll")}
        </Link>
      </div>
    </div>
  );
}
