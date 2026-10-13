import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { NewsArticle } from "@/lib/news/types";
import { SOURCE_CONFIG, getArticleUrl } from "@/lib/news-config";
import { cn } from "@/lib/utils";
import { NewsThumb } from "./news-thumb";
import { cleanSnippet, cleanTitle, formatNewsDate } from "./news-text";

/**
 * - `tile`: a row on phones, a tile with the picture on top from `sm` up (player pages).
 * - `row`: the text-first row at every width: headline, source and time, a small
 *   picture on the right. What the news feed is made of, so a screen holds many headlines.
 * - `lead`: the feed's top story. A row on phones; from `sm` up a card with a big
 *   picture (on top, then beside the text from `lg`).
 */
export type NewsCardVariant = "tile" | "row" | "lead";

const STYLES: Record<
  NewsCardVariant,
  { link: string; thumb: string; thumbSizes: string; body: string; title: string; snippet: string }
> = {
  tile: {
    link: "sm:block sm:min-h-0 sm:overflow-hidden sm:border sm:bg-[var(--surface-2)] sm:p-0 sm:hover:border-[var(--line-strong)] sm:hover:bg-[var(--surface-3)]",
    thumb: "w-[104px] sm:w-full sm:aspect-video",
    thumbSizes: "(max-width: 640px) 104px, (max-width: 1024px) 50vw, 360px",
    body: "sm:gap-2 sm:p-4",
    title: "",
    snippet: "line-clamp-2 max-sm:hidden",
  },
  row: {
    link: "",
    thumb: "w-[104px] lg:w-24",
    thumbSizes: "(min-width: 1024px) 96px, 104px",
    body: "",
    title: "",
    snippet: "hidden",
  },
  lead: {
    link: "sm:min-h-0 sm:flex-col sm:gap-0 sm:overflow-hidden sm:border sm:bg-[var(--surface-2)] sm:py-0 sm:hover:border-[var(--line-strong)] sm:hover:bg-[var(--surface-3)] lg:flex-row",
    thumb: "w-[104px] sm:order-1 sm:w-full sm:aspect-[5/2] lg:aspect-video lg:w-[44%] lg:shrink-0",
    thumbSizes: "(max-width: 640px) 104px, (max-width: 1024px) 100vw, 480px",
    body: "sm:order-2 sm:gap-2 sm:p-5 lg:justify-center lg:p-6",
    title: "sm:text-xl sm:leading-[1.25] lg:text-2xl",
    snippet: "line-clamp-3 max-sm:hidden",
  },
};

interface NewsCardProps {
  article: NewsArticle;
  /** Fixed render time so server HTML and hydrated markup print the same date. */
  nowMs: number;
  isRead?: boolean;
  priority?: boolean;
  variant?: NewsCardVariant;
}

/** One headline. The source is plain text: no outlet colours or logos. */
export function NewsCard({ article, nowMs, isRead = false, priority = false, variant = "tile" }: NewsCardProps) {
  const t = useTranslations("News.feed");
  // The reader's language, not the article's: an English story in the Vietnamese UI still says "4 giờ trước".
  const uiLocale = useLocale() === "vi" ? "vi" : "en";
  const title = cleanTitle(article.title);
  const snippet = cleanSnippet(article.contentSnippet, title);
  const sourceLabel = SOURCE_CONFIG[article.source]?.label;
  const date = formatNewsDate(article.pubDate, uiLocale, nowMs);
  const meta = [sourceLabel, date, isRead ? t("read") : null].filter(Boolean).join(" · ");
  const s = STYLES[variant];

  return (
    <Link
      href={getArticleUrl(article.link)}
      className={cn(
        "group flex min-h-[104px] gap-3 border-b border-[var(--line)] py-3.5 transition-colors",
        s.link,
      )}
    >
      <div className={cn("relative order-2 aspect-[4/3] shrink-0 self-start bg-[var(--surface-3)]", s.thumb)}>
        <NewsThumb src={article.thumbnail ?? article.heroImage} source={article.source} sizes={s.thumbSizes} priority={priority} />
      </div>
      <div className={cn("order-1 flex min-w-0 flex-1 flex-col gap-1.5", s.body)}>
        <h3
          className={cn(
            "line-clamp-3 font-inter text-base font-bold leading-[1.35] decoration-lfc-red decoration-2 underline-offset-4 group-hover:underline",
            isRead ? "text-white/60" : "text-white",
            s.title,
          )}
        >
          {title}
        </h3>
        {snippet && <p className={cn("text-sm leading-relaxed text-stadium-muted", s.snippet)}>{snippet}</p>}
        {meta && <p className="mt-auto text-[13px] leading-snug text-stadium-muted">{meta}</p>}
      </div>
    </Link>
  );
}

/** Skeleton with the same geometry as the `row` card. */
export function NewsCardSkeleton() {
  return (
    <div aria-hidden className="flex min-h-[104px] gap-3 border-b border-[var(--line)] py-3.5">
      <div className="skeleton order-2 aspect-[4/3] w-[104px] shrink-0 self-start lg:w-24" />
      <div className="order-1 flex min-w-0 flex-1 flex-col gap-2">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-11/12" />
        <div className="skeleton h-4 w-2/3" />
        <div className="skeleton mt-auto h-3.5 w-32" />
      </div>
    </div>
  );
}
