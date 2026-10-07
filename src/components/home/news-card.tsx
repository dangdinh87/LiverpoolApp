import { Link } from "@/i18n/navigation";
import { SOURCE_CONFIG, formatRelativeDate, getArticleUrl } from "@/lib/news-config";
import type { NewsArticle } from "@/lib/news/types";
import { NewsThumb } from "./news-thumb";
import { cleanTitle } from "./news-utils";

interface NewsHeadlineProps {
  article: NewsArticle;
  locale: "vi" | "en";
}

/**
 * One headline row for "Tin nhanh": the title is the link, then the outlet's
 * name and age as plain text, with a small thumbnail on the right. The thumbnail
 * box has a fixed aspect ratio, so nothing shifts when images arrive.
 */
export function NewsHeadline({ article, locale }: NewsHeadlineProps) {
  const title = cleanTitle(article.title);
  const when = formatRelativeDate(article.pubDate, locale);
  const source = SOURCE_CONFIG[article.source]?.label;

  return (
    <Link
      href={getArticleUrl(article.link)}
      className="group flex min-h-[5.25rem] items-start gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-3)]"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="text-[15px] font-semibold leading-snug text-white line-clamp-3 transition-colors group-hover:text-lfc-gold sm:text-base">
          {title}
        </p>
        <p className="flex items-center gap-2 text-[13px] text-stadium-muted">
          {source && <span className="truncate">{source}</span>}
          {source && when && <span aria-hidden>·</span>}
          {when && <span className="shrink-0">{when}</span>}
        </p>
      </div>
      <div className="relative aspect-[4/3] w-24 shrink-0 overflow-hidden sm:w-28">
        <NewsThumb src={article.thumbnail} sizes="112px" crestClassName="w-8" />
      </div>
    </Link>
  );
}
