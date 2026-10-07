import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { SiteArticleBadge } from "@/components/news/site-article-badge";
import { keepDatesTogether, leadSentences } from "@/components/news/news-text";
import { defaultTimeZoneForLocale, formatMatchDayMonth, formatMatchTime } from "@/lib/format-match-date";
import { BRAND } from "@/lib/brand";

interface DigestProps {
  date: string;
  title: string;
  summary: string;
  articleCount: number;
  generatedAt?: string;
  /** Heading level; the news page uses h2, sections that already have an h2 use h3. */
  as?: "h2" | "h3";
}

/**
 * Featured card for the daily digest (the site's own piece, so it leads the news
 * list). Server-rendered: no client state, and every time uses the fixed Vietnam
 * zone, so it cannot disagree with its own hydration.
 */
export function DigestCard({ date, title, summary, articleCount, generatedAt, as: Heading = "h3" }: DigestProps) {
  const t = useTranslations("News.digest");
  const locale = useLocale() === "vi" ? "vi" : "en";
  const dateText = formatMatchDayMonth(new Date(`${date}T00:00:00+07:00`), locale);
  const lead = leadSentences(summary, 260);
  const meta = [
    articleCount > 0 ? t("articleCount", { count: articleCount }) : null,
    generatedAt ? t("generatedAt", { time: formatMatchTime(new Date(generatedAt), defaultTimeZoneForLocale(locale)) }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="surface relative border-l-4 border-l-lfc-red p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <SiteArticleBadge label={t("proBadge", { brand: BRAND.name })} compact />
        <span className="text-[13px] text-stadium-muted">{dateText}</span>
      </div>
      <Heading className="mt-3 text-balance font-bebas text-[30px] leading-[1.05] text-white sm:text-4xl">{keepDatesTogether(title)}</Heading>
      {lead && <p className="mt-2 max-w-2xl text-base leading-[1.55] text-white/80 line-clamp-2 sm:line-clamp-3">{lead}</p>}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <Link
          href={`/news/digest/${date}`}
          className="inline-flex min-h-12 items-center justify-center gap-2 bg-lfc-red px-6 font-barlow text-sm font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-lfc-red-dark sm:min-h-11"
        >
          {t("readFull")}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
        {meta && <span className="hidden text-[13px] text-stadium-muted sm:inline">{meta}</span>}
      </div>
    </section>
  );
}
