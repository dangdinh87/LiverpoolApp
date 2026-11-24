import { ArrowRight, Headphones } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { NewsArticle } from "@/lib/news/types";
import { SOURCE_CONFIG } from "@/lib/news-config";
import { cleanTitle } from "@/components/news/news-text";
import { NewsThumb } from "@/components/home/news-thumb";
import { LocalMatchDay } from "@/components/ui/local-time";

/** Latest Liverpool podcast episodes (direct audio/show links). */
export async function PodcastStrip({
  items,
  locale,
  moreHref,
}: {
  items: NewsArticle[];
  locale: "en" | "vi";
  moreHref?: string;
}) {
  if (items.length === 0) return null;
  const t = await getTranslations("News.podcasts");

  return (
    <section id="podcasts" aria-labelledby="podcast-strip-heading" className="scroll-mt-24 mt-10">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2
          id="podcast-strip-heading"
          className="font-bebas text-2xl tracking-wide text-white sm:text-3xl"
        >
          {t("title")}
        </h2>
        {moreHref ? (
          <Link
            href={moreHref}
            className="inline-flex min-h-11 items-center gap-1 font-barlow text-xs font-semibold uppercase tracking-[0.12em] text-lfc-gold transition-colors hover:text-white"
          >
            {t("viewAll")}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        ) : (
          <p className="font-barlow text-xs uppercase tracking-[0.12em] text-stadium-muted">
            {t("eyebrow")}
          </p>
        )}
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const showName = item.author ?? SOURCE_CONFIG[item.source]?.label;
          const duration = item.tags?.[0];
          return (
            <li key={item.link}>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="surface group flex items-start gap-3 p-3.5 transition-colors hover:border-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lfc-red-text"
              >
                <div className="relative size-16 shrink-0 overflow-hidden border border-stadium-border bg-[var(--surface-3)]">
                  <NewsThumb src={item.thumbnail} sizes="64px" />
                  <span
                    aria-hidden
                    className="absolute bottom-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/75 text-white"
                  >
                    <Headphones className="size-3" />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  {showName && (
                    <p className="truncate font-barlow text-[11px] font-semibold uppercase tracking-[0.1em] text-lfc-gold">
                      {showName}
                    </p>
                  )}
                  <h3 className="mt-0.5 line-clamp-2 font-inter text-sm font-semibold leading-snug text-white transition-colors group-hover:text-lfc-red-text">
                    {cleanTitle(item.title)}
                  </h3>
                  <p className="mt-1.5 flex items-center gap-2 font-barlow text-xs uppercase tracking-[0.1em] text-stadium-muted tabular-nums">
                    <LocalMatchDay iso={item.pubDate} locale={locale} />
                    {duration && (
                      <>
                        <span aria-hidden>·</span>
                        <span>{duration}</span>
                      </>
                    )}
                  </p>
                </div>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
