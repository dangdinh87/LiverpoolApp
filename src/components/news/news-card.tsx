import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { NewsArticle } from "@/lib/news/types";
import { SOURCE_CONFIG, getArticleUrl } from "@/lib/news-config";
import { NewsThumb } from "./news-thumb";
import { cleanSnippet, cleanTitle, formatNewsDate } from "./news-text";

interface NewsCardProps {
  article: NewsArticle;
  /** Fixed render time so server HTML and hydrated markup print the same date. */
  nowMs: number;
  isRead?: boolean;
  priority?: boolean;
}

/**
 * One headline. A flat row on phones (headline, then source and time, thumbnail
 * on the right) and a tile with the picture on top from `sm` up. The source is
 * plain text: no outlet colours or logos.
 */
export function NewsCard({ article, nowMs, isRead = false, priority = false }: NewsCardProps) {
  const t = useTranslations("News.feed");
  // The reader's language, not the article's: an English story in the Vietnamese UI still says "4 giờ trước".
  const uiLocale = useLocale() === "vi" ? "vi" : "en";
  const title = cleanTitle(article.title);
  const snippet = cleanSnippet(article.contentSnippet, title);
  const sourceLabel = SOURCE_CONFIG[article.source]?.label;
  const date = formatNewsDate(article.pubDate, uiLocale, nowMs);
  const meta = [sourceLabel, date, isRead ? t("read") : null].filter(Boolean).join(" · ");

  return (
    <Link
      href={getArticleUrl(article.link)}
      className="group flex min-h-[104px] gap-3 border-b border-[var(--line)] py-3.5 transition-colors sm:block sm:min-h-0 sm:overflow-hidden sm:border sm:bg-[var(--surface-2)] sm:p-0 sm:hover:border-[var(--line-strong)] sm:hover:bg-[var(--surface-3)]"
    >
      <div className="relative order-2 aspect-[4/3] w-[104px] shrink-0 self-start bg-[var(--surface-3)] sm:w-full sm:aspect-video">
        <NewsThumb
          src={article.thumbnail ?? article.heroImage}
          source={article.source}
          sizes="(max-width: 640px) 104px, (max-width: 1024px) 50vw, 360px"
          priority={priority}
        />
      </div>
      <div className="order-1 flex min-w-0 flex-1 flex-col gap-1.5 sm:gap-2 sm:p-4">
        <h3
          className={`line-clamp-3 font-inter text-base font-bold leading-[1.35] decoration-lfc-red decoration-2 underline-offset-4 group-hover:underline ${isRead ? "text-white/60" : "text-white"}`}
        >
          {title}
        </h3>
        {snippet && <p className="line-clamp-2 text-sm leading-relaxed text-stadium-muted max-sm:hidden">{snippet}</p>}
        {meta && <p className="mt-auto text-[13px] leading-snug text-stadium-muted">{meta}</p>}
      </div>
    </Link>
  );
}

/** Skeleton with the same geometry as `NewsCard`. */
export function NewsCardSkeleton() {
  return (
    <div
      aria-hidden
      className="flex min-h-[104px] gap-3 border-b border-[var(--line)] py-3.5 sm:block sm:min-h-0 sm:border sm:bg-[var(--surface-2)] sm:p-0"
    >
      <div className="skeleton order-2 aspect-[4/3] w-[104px] shrink-0 self-start sm:w-full sm:aspect-video" />
      <div className="order-1 flex min-w-0 flex-1 flex-col gap-2 sm:p-4">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-11/12" />
        <div className="skeleton h-4 w-2/3" />
        <div className="skeleton mt-auto h-3.5 w-32" />
      </div>
    </div>
  );
}
