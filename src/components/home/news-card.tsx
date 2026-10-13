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
        <p className="font-serif text-base font-semibold leading-snug text-white line-clamp-3 transition-colors group-hover:text-lfc-gold sm:text-[17px]">
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

/**
 * The newest story as the lead of "Tin nhanh": a wide picture, then the
 * headline in a larger size and the outlet with its age.
 */
export function NewsLeadStory({ article, locale }: NewsHeadlineProps) {
  const title = cleanTitle(article.title);
  const when = formatRelativeDate(article.pubDate, locale);
  const source = SOURCE_CONFIG[article.source]?.label;

  return (
    <Link href={getArticleUrl(article.link)} className="group flex h-full flex-col bg-[var(--surface-2)] transition-colors hover:bg-[var(--surface-3)]">
      {/* Beside the headline list the picture grows to the list's height instead of leaving a gap. */}
      <div className="relative aspect-video overflow-hidden md:aspect-auto md:min-h-56 md:flex-1">
        <NewsThumb src={article.thumbnail} sizes="(max-width: 1024px) 100vw, 480px" crestClassName="w-14" />
      </div>
      <div className="flex flex-col gap-2 p-4 sm:p-5">
        <p className="text-balance text-lg font-bold leading-snug text-white decoration-lfc-red decoration-2 underline-offset-4 group-hover:underline sm:text-xl">
          {title}
        </p>
        <p className="flex items-center gap-2 text-[13px] text-stadium-muted">
          {source && <span className="truncate">{source}</span>}
          {source && when && <span aria-hidden>·</span>}
          {when && <span className="shrink-0">{when}</span>}
        </p>
      </div>
    </Link>
  );
}
