"use client";

import { ChevronDown, Layers } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { NewsArticle } from "@/lib/news/types";
import { SOURCE_CONFIG, getArticleUrl } from "@/lib/news-config";
import { NewsCard } from "./news-card";
import { cleanTitle } from "./news-text";

interface StoryCardProps {
  lead: NewsArticle;
  /** The same story from other outlets (see clusterStories). */
  related: NewsArticle[];
  nowMs: number;
  isRead: boolean;
  priority: boolean;
}

/** Outlets named on the collapsed line; the rest are counted. */
const NAMED = 2;

/**
 * A story as one card: the newest article, then a line naming the other outlets
 * that ran it, which opens into their headlines. Five near-identical cards
 * become one, and the reader can still pick whose take to read.
 */
export function StoryCard({ lead, related, nowMs, isRead, priority }: StoryCardProps) {
  const t = useTranslations("News.feed");
  if (related.length === 0) return <NewsCard article={lead} nowMs={nowMs} priority={priority} isRead={isRead} />;

  const names = related.map((a) => SOURCE_CONFIG[a.source]?.label ?? a.source);
  const extra = names.length - NAMED;

  return (
    <div className="min-w-0 sm:flex sm:flex-col">
      <NewsCard article={lead} nowMs={nowMs} priority={priority} isRead={isRead} />
      <details className="group -mt-px border-b border-[var(--line)] sm:border sm:border-t-0 sm:bg-[var(--surface-2)]">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 py-2 text-[13px] text-stadium-muted transition-colors hover:text-white sm:px-4 [&::-webkit-details-marker]:hidden">
          <Layers className="size-3.5 shrink-0 text-lfc-gold" aria-hidden />
          <span className="min-w-0 truncate">
            <span className="font-semibold text-white/85">{t("alsoCovering", { count: related.length })}</span>
            {" "}
            {names.slice(0, NAMED).join(", ")}
            {extra > 0 && ` +${extra}`}
          </span>
          <ChevronDown className="ml-auto size-4 shrink-0 transition-transform duration-200 group-open:rotate-180" aria-hidden />
        </summary>
        <ul className="pb-2 sm:px-4">
          {related.map((a) => (
            <li key={a.link}>
              <Link
                href={getArticleUrl(a.link)}
                className="group/item block py-2 text-sm leading-snug text-white/85 transition-colors hover:text-white"
              >
                <span className="line-clamp-2 decoration-lfc-red decoration-2 underline-offset-4 group-hover/item:underline">
                  {cleanTitle(a.title)}
                </span>
                <span className="mt-0.5 block text-xs text-stadium-muted">{SOURCE_CONFIG[a.source]?.label ?? a.source}</span>
              </Link>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
