import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { SiteArticleBadge } from "@/components/news/site-article-badge";
import { formatMatchTime } from "@/lib/format-match-date";

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
 * Highlight card for the daily digest. Server-rendered: no client state, so it
 * cannot disagree with its own hydration (times use the fixed Vietnam zone).
 */
export function DigestCard({ date, title, summary, articleCount, generatedAt, as: Heading = "h3" }: DigestProps) {
  const t = useTranslations("News.digest");

  return (
    <section className="surface relative flex flex-col gap-4 border-l-4 border-l-lfc-red p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <SiteArticleBadge label={t("proBadge")} compact />
          <span className="text-xs text-stadium-muted">
            {t("articleCount", { count: articleCount })}
            {generatedAt ? ` · ${t("generatedAt", { time: formatMatchTime(new Date(generatedAt)) })}` : ""}
          </span>
        </div>
        <Heading className="font-bebas text-[26px] leading-[1.05] text-white sm:text-3xl">{title}</Heading>
        <p className="mt-2 hidden text-[15px] leading-relaxed text-stadium-muted sm:line-clamp-3 sm:block">{summary}</p>
      </div>
      <Link
        href={`/news/digest/${date}`}
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 bg-lfc-red px-5 font-barlow text-sm font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-lfc-red-dark"
      >
        {t("readFull")}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </section>
  );
}
