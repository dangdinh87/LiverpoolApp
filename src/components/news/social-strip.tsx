import { ArrowRight, ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { NewsArticle } from "@/lib/news/types";
import { SOURCE_CONFIG } from "@/lib/news-config";
import { cleanTitle } from "@/components/news/news-text";
import { LocalMatchDay } from "@/components/ui/local-time";

/** Tier-1 LFC reporter & fan-media dispatches from Bluesky. */
export async function SocialStrip({
  items,
  locale,
  moreHref,
}: {
  items: NewsArticle[];
  locale: "en" | "vi";
  moreHref?: string;
}) {
  if (items.length === 0) return null;
  const t = await getTranslations("News.social");

  return (
    <section id="social" aria-labelledby="social-strip-heading" className="scroll-mt-24 mt-10">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2
          id="social-strip-heading"
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

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const authorName = item.author ?? SOURCE_CONFIG[item.source]?.label;
          const handle = item.tags?.[0];
          const text = item.contentSnippet || cleanTitle(item.title);
          return (
            <li key={item.link}>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="surface group flex h-full flex-col justify-between gap-2.5 p-4 transition-colors hover:border-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lfc-red-text"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 truncate">
                      {authorName && (
                        <span className="font-inter text-xs font-semibold text-white">
                          {authorName}
                        </span>
                      )}
                      {handle && (
                        <span className="ml-1.5 font-inter text-xs text-stadium-muted">
                          {handle}
                        </span>
                      )}
                    </div>
                    <ArrowUpRight className="size-3.5 shrink-0 text-stadium-muted transition-colors group-hover:text-white" aria-hidden />
                  </div>
                  <p className="mt-2 line-clamp-3 font-inter text-sm leading-relaxed text-white/90 group-hover:text-white">
                    {text}
                  </p>
                </div>
                <p className="font-barlow text-xs uppercase tracking-[0.1em] text-stadium-muted tabular-nums">
                  <LocalMatchDay iso={item.pubDate} locale={locale} />
                </p>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
