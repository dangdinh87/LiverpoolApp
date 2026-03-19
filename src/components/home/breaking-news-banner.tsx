"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { NewsArticle } from "@/lib/news/types";
import { getArticleUrl, formatRelativeDate } from "@/lib/news-config";

interface BreakingNewsBannerProps {
  articles: NewsArticle[];
}

/**
 * Glassmorphism breaking news banner — shown when articles < 1h old exist.
 * Auto-dismisses after article ages past 1h. User can manually close.
 */
export function BreakingNewsBanner({ articles }: BreakingNewsBannerProps) {
  const t = useTranslations("Home.breaking");
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted || dismissed) return null;

  // Find most recent article published within last hour
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const breaking = articles.find((a) => {
    const pubTime = new Date(a.pubDate).getTime();
    return pubTime > oneHourAgo;
  });

  if (!breaking) return null;

  return (
    <div className="sticky top-[60px] z-40 backdrop-blur-md bg-lfc-red/15 border-b border-lfc-red/30 shadow-lg animate-in slide-in-from-top duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-3">
        <AlertCircle className="w-4 h-4 text-lfc-red shrink-0 animate-pulse" />
        <div className="flex-1 min-w-0">
          <span className="font-barlow text-[10px] font-bold text-lfc-red uppercase tracking-wider mr-2">
            {t("label")}
          </span>
          <Link
            href={getArticleUrl(breaking.link)}
            className="font-inter text-sm text-white hover:text-lfc-gold transition-colors line-clamp-1"
          >
            {breaking.title}
          </Link>
          <span className="font-inter text-[10px] text-stadium-muted ml-2">
            {formatRelativeDate(breaking.pubDate, breaking.language)}
          </span>
        </div>
        <Link
          href={getArticleUrl(breaking.link)}
          className="font-barlow text-[10px] font-bold uppercase tracking-wider text-lfc-red hover:text-white px-2.5 py-1 border border-lfc-red/30 hover:bg-lfc-red/20 transition-colors shrink-0 hidden sm:block"
        >
          {t("read")}
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="text-stadium-muted hover:text-white transition-colors cursor-pointer shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
