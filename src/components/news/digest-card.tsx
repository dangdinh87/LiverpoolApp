import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SiteArticleBadge } from "@/components/news/site-article-badge";
import { keepDatesTogether } from "@/components/news/news-text";
import { formatMatchDayMonth } from "@/lib/format-match-date";
import { BRAND } from "@/lib/brand";

interface DigestProps {
  date: string;
  title: string;
  articleCount: number;
  /** Heading level; the news page uses h2, sections that already have an h2 use h3. */
  as?: "h2" | "h3";
}

/**
 * The daily digest as a banner above the feed: who wrote it and which day, its
 * headline, and the button to read it, in one row (~85px). It used to be a
 * 260px card with an excerpt that pushed the first headline off the first screen.
 * The title is the one the digest page opens with (see getDigestHeadline).
 *
 * Server-rendered: no client state, and the date uses the fixed Vietnam zone,
 * so it cannot disagree with its own hydration.
 */
export function DigestCard({ date, title, articleCount, as: Heading = "h3" }: DigestProps) {
  const t = useTranslations("News.digest");
  const locale = useLocale() === "vi" ? "vi" : "en";
  const dateText = formatMatchDayMonth(new Date(`${date}T00:00:00+07:00`), locale);
  const href = `/news/digest/${date}`;

  return (
    <section className="surface flex items-center gap-3 border-l-4 border-l-lfc-red py-3 pl-4 pr-3 sm:gap-6 sm:py-3.5 sm:pl-5 sm:pr-4">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
          <SiteArticleBadge label={t("proBadge", { brand: BRAND.name })} compact />
          <span className="text-xs text-stadium-muted">
            {dateText}
            {articleCount > 0 && <span className="max-sm:hidden"> · {t("articleCount", { count: articleCount })}</span>}
          </span>
        </p>
        <Heading className="mt-1 line-clamp-2 text-balance font-bebas text-[22px] leading-[1.08] text-white sm:text-[26px]">
          <Link href={href} className="hover:text-white/90">
            {keepDatesTogether(title)}
          </Link>
        </Heading>
      </div>
      <Button
        asChild
        size="lg"
        className="min-h-11 shrink-0 font-barlow text-sm font-semibold uppercase tracking-[0.1em] max-sm:size-11 max-sm:px-0"
      >
        <Link href={href}>
          <span className="max-sm:sr-only">{t("readFull")}</span>
          <ArrowRight aria-hidden />
        </Link>
      </Button>
    </section>
  );
}
