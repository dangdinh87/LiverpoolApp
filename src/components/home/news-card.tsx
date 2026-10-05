import Link from "next/link";
import { SOURCE_CONFIG, formatRelativeDate, getArticleUrl } from "@/lib/news-config";
import type { NewsArticle } from "@/lib/news/types";
import { cn } from "@/lib/utils";
import { NewsThumb } from "./news-thumb";
import { cleanSnippet, cleanTitle } from "./news-utils";

export type NewsCardVariant = "lead" | "row" | "compact";

interface NewsCardProps {
  article: NewsArticle;
  variant?: NewsCardVariant;
  locale: "vi" | "en";
  /** Label shown when the article has no usable snippet (the category name). */
  categoryLabel?: string;
  className?: string;
}

function SourceBadge({ source }: { source: NewsArticle["source"] }) {
  const cfg = SOURCE_CONFIG[source];
  if (!cfg) return null;
  return (
    <span className={cn("inline-flex shrink-0 items-center px-1.5 py-0.5 font-barlow text-xs font-bold uppercase tracking-wider", cfg.color)}>
      {cfg.label}
    </span>
  );
}

/**
 * The one news card used across the homepage.
 * - lead: large image with the headline over a scrim
 * - row: thumbnail left, text right
 * - compact: text only (topic lists)
 * Fixed aspect boxes everywhere, so nothing shifts when images arrive.
 */
export function NewsCard({ article, variant = "row", locale, categoryLabel, className }: NewsCardProps) {
  const href = getArticleUrl(article.link);
  const title = cleanTitle(article.title);
  const when = formatRelativeDate(article.pubDate, locale);

  if (variant === "lead") {
    const snippet = cleanSnippet(article.contentSnippet, article.title) ?? categoryLabel ?? null;
    return (
      <Link
        href={href}
        className={cn("group surface-interactive relative block overflow-hidden", className)}
      >
        <div className="relative aspect-[4/3] w-full sm:aspect-[16/10]">
          <NewsThumb
            src={article.thumbnail}
            sizes="(max-width: 1024px) 100vw, 66vw"
            className="transition-opacity duration-300 group-hover:opacity-90"
            crestClassName="w-16"
          />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
            <div className="mb-2 flex items-center gap-2">
              <SourceBadge source={article.source} />
              {when && <span className="text-xs text-white/70">{when}</span>}
            </div>
            <h3 className="text-xl font-bold leading-snug text-white text-balance line-clamp-3 sm:text-2xl lg:text-[1.65rem]">
              {title}
            </h3>
            {snippet && <p className="mt-2 hidden text-sm text-white/70 line-clamp-2 sm:block">{snippet}</p>}
          </div>
        </div>
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <Link
        href={href}
        className={cn("group flex min-h-11 flex-col justify-center gap-1 py-2.5", className)}
      >
        <p className="text-[15px] font-medium leading-snug text-white line-clamp-2 transition-colors group-hover:text-lfc-gold">
          {title}
        </p>
        <p className="flex items-center gap-2 text-xs text-stadium-muted">
          <span className="truncate">{SOURCE_CONFIG[article.source]?.label}</span>
          {when && <span aria-hidden>·</span>}
          {when && <span className="shrink-0">{when}</span>}
        </p>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn("group surface-interactive flex min-h-[5.5rem] gap-3 p-3", className)}
    >
      <div className="relative aspect-[4/3] w-28 shrink-0 self-start overflow-hidden sm:w-32">
        <NewsThumb src={article.thumbnail} sizes="128px" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5">
        <p className="text-[15px] font-semibold leading-snug text-white line-clamp-3 transition-colors group-hover:text-lfc-gold">
          {title}
        </p>
        <div className="flex items-center gap-2">
          <SourceBadge source={article.source} />
          {when && <span className="truncate text-xs text-stadium-muted">{when}</span>}
        </div>
      </div>
    </Link>
  );
}
