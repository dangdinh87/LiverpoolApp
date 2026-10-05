import Link from "next/link";
import { useTranslations } from "next-intl";
import type { NewsArticle } from "@/lib/news/types";
import { CATEGORY_CONFIG, SOURCE_CONFIG, getArticleUrl } from "@/lib/news-config";
import { NewsThumb } from "./news-thumb";
import { cleanSnippet, cleanTitle, formatNewsDate } from "./news-text";

const CATEGORY_LABEL_KEY: Record<string, string> = {
  "match-report": "catMatch",
  transfer: "catTransfer",
  injury: "catInjury",
  "team-news": "catTeamNews",
  analysis: "catAnalysis",
  opinion: "catOpinion",
};

interface NewsCardProps {
  article: NewsArticle;
  /** Fixed render time so server HTML and hydrated markup print the same date. */
  nowMs: number;
  /** `lead` = the top story; `card` = list row on phones, tile from `sm` up. */
  variant?: "lead" | "card";
  isRead?: boolean;
  priority?: boolean;
}

function Meta({ article, nowMs }: { article: NewsArticle; nowMs: number }) {
  const t = useTranslations("News.feed");
  const source = SOURCE_CONFIG[article.source];
  const category = article.category && article.category !== "general" ? article.category : null;
  const categoryKey = category ? CATEGORY_LABEL_KEY[category] : undefined;
  const date = formatNewsDate(article.pubDate, article.language, nowMs);
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
      {source && (
        <span className={`font-barlow font-bold text-[11px] uppercase tracking-wider px-1.5 py-0.5 ${source.color}`}>
          {source.label}
        </span>
      )}
      {category && categoryKey && (
        <span className={`font-barlow font-bold text-[11px] uppercase tracking-wider px-1.5 py-0.5 ${CATEGORY_CONFIG[category].color}`}>
          {t(categoryKey)}
        </span>
      )}
      {date && <span className="text-xs text-stadium-muted">{date}</span>}
    </div>
  );
}

export function NewsCard({ article, nowMs, variant = "card", isRead = false, priority = false }: NewsCardProps) {
  const t = useTranslations("News.feed");
  const title = cleanTitle(article.title);
  const snippet = cleanSnippet(article.contentSnippet, title);
  const href = getArticleUrl(article.link);
  const titleTone = isRead ? "text-white/60" : "text-white";

  if (variant === "lead") {
    return (
      <Link href={href} className="group surface-interactive grid lg:grid-cols-5 overflow-hidden">
        <div className="relative aspect-[16/10] lg:col-span-3 lg:aspect-auto lg:min-h-[340px] bg-[var(--surface-3)]">
          <NewsThumb
            src={article.thumbnail ?? article.heroImage}
            source={article.source}
            sizes="(max-width: 1024px) 100vw, 640px"
            priority={priority}
          />
        </div>
        <div className="flex flex-col justify-center gap-3 p-4 sm:p-6 lg:col-span-2">
          <Meta article={article} nowMs={nowMs} />
          <h3 className={`font-inter text-[22px] sm:text-[26px] lg:text-[28px] font-extrabold leading-[1.2] text-balance line-clamp-4 group-hover:underline decoration-lfc-red decoration-2 underline-offset-4 ${titleTone}`}>
            {title}
          </h3>
          {snippet && <p className="hidden sm:block text-[15px] leading-relaxed text-stadium-muted line-clamp-3">{snippet}</p>}
          {isRead && <span className="text-xs text-stadium-muted">{t("read")}</span>}
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="group surface-interactive flex gap-3 p-3 sm:p-0 sm:block overflow-hidden min-h-[96px]"
    >
      <div className="relative order-2 w-[104px] shrink-0 self-start aspect-[4/3] sm:w-full sm:aspect-video bg-[var(--surface-3)]">
        <NewsThumb
          src={article.thumbnail ?? article.heroImage}
          source={article.source}
          sizes="(max-width: 640px) 104px, (max-width: 1024px) 50vw, 360px"
          priority={priority}
        />
      </div>
      <div className="order-1 flex-1 min-w-0 flex flex-col gap-2 sm:p-4">
        <Meta article={article} nowMs={nowMs} />
        <h3 className={`font-inter text-[15px] sm:text-base font-bold leading-snug line-clamp-3 group-hover:underline decoration-lfc-red decoration-2 underline-offset-4 ${titleTone}`}>
          {title}
        </h3>
        {snippet && <p className="hidden sm:block text-sm leading-relaxed text-stadium-muted line-clamp-2">{snippet}</p>}
        {isRead && <span className="text-xs text-stadium-muted">{t("read")}</span>}
      </div>
    </Link>
  );
}

/** Skeleton with the same geometry as `NewsCard` variant="card". */
export function NewsCardSkeleton() {
  return (
    <div aria-hidden className="surface flex gap-3 p-3 sm:p-0 sm:block min-h-[96px]">
      <div className="skeleton order-2 w-[104px] shrink-0 self-start aspect-[4/3] sm:w-full sm:aspect-video" />
      <div className="order-1 flex-1 min-w-0 flex flex-col gap-2 sm:p-4">
        <div className="skeleton h-4 w-28" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-4/5" />
        <div className="skeleton hidden sm:block h-3.5 w-full" />
      </div>
    </div>
  );
}
