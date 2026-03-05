"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Newspaper, Clock } from "lucide-react";
import type { NewsArticle } from "@/lib/rss-parser";
import {
  SOURCE_CONFIG,
  formatRelativeDate,
  type NewsSource,
  type NewsLanguage,
} from "@/lib/news-config";

interface NewsSectionProps {
  articles: NewsArticle[];
}

function Badge({
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

export function NewsSection({ articles }: NewsSectionProps) {
  if (articles.length === 0) return null;

  const featured = articles[0];
  const rest = articles.slice(1);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="flex items-end justify-between mb-8"
      >
        <div>
          <p className="font-barlow text-lfc-red uppercase tracking-widest text-sm font-semibold mb-1">
            Multi-Source
          </p>
          <h2 className="font-bebas text-5xl md:text-6xl text-white tracking-wider">
            Latest News
          </h2>
        </div>
        <Link
          href="/news"
          className="font-barlow text-sm text-lfc-red hover:underline uppercase tracking-wider font-semibold"
        >
          All News →
        </Link>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Featured card — spans 2 cols on lg */}
        <motion.a
          href={featured.link}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.4 }}
          className="group lg:col-span-2 block relative overflow-hidden rounded-sm cursor-pointer"
        >
          <div className="relative aspect-video w-full">
            {featured.thumbnail ? (
              <Image
                src={featured.thumbnail}
                alt={featured.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 66vw"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-lfc-red/20 to-stadium-bg flex items-center justify-center">
                <Newspaper className="w-10 h-10 text-stadium-muted" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-2">
              <Badge source={featured.source} language={featured.language} />
              <span className="text-white/40 text-xs">·</span>
              <span className="font-inter text-xs text-white/60 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatRelativeDate(featured.pubDate)}
              </span>
            </div>
            <h3 className="font-inter text-lg sm:text-xl font-bold text-white leading-snug group-hover:text-lfc-gold transition-colors line-clamp-2">
              {featured.title}
            </h3>
            {featured.contentSnippet && (
              <p className="font-inter text-sm text-white/60 mt-1 line-clamp-2 hidden sm:block">
                {featured.contentSnippet}
              </p>
            )}
          </div>
        </motion.a>

        {/* Remaining cards — thumbnail + title + badge */}
        {rest.map((article, i) => (
          <motion.a
            key={article.link}
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, delay: (i + 1) * 0.06 }}
            className="group bg-stadium-surface border border-stadium-border rounded-sm overflow-hidden hover:border-lfc-red/40 transition-all duration-300 cursor-pointer"
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
                <div className="absolute inset-0 bg-gradient-to-br from-lfc-red/20 to-stadium-bg flex items-center justify-center">
                  <Newspaper className="w-6 h-6 text-stadium-muted" />
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge source={article.source} language={article.language} />
                <span className="text-stadium-border text-xs">·</span>
                <span className="font-inter text-xs text-stadium-muted">
                  {formatRelativeDate(article.pubDate)}
                </span>
              </div>
              <p className="font-inter text-sm text-white font-medium leading-snug group-hover:text-lfc-red transition-colors line-clamp-3">
                {article.title}
              </p>
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  );
}
