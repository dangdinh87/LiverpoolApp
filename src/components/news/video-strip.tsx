import { Play } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { NewsArticle } from "@/lib/news/types";
import { NewsThumb } from "@/components/home/news-thumb";
import { LocalMatchDay } from "@/components/ui/local-time";

/**
 * The club's latest videos, as a strip of their own.
 *
 * Deliberately not merged into the news feed. A video has no article body to
 * read here, so every card leaves the site, and mixing them in would mean a
 * clip taking a slot from a written story in the same list. They also never go
 * through the extractor or the translator — `lfctv` is in `LINK_OUT_ONLY`.
 */
export async function VideoStrip({
  items,
  locale,
}: {
  items: NewsArticle[];
  locale: "en" | "vi";
}) {
  if (items.length === 0) return null;
  const t = await getTranslations("News.video");

  return (
    <section aria-labelledby="video-strip-heading" className="mt-10">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2
          id="video-strip-heading"
          className="font-bebas text-2xl tracking-wide text-white sm:text-3xl"
        >
          {t("title")}
        </h2>
        <p className="font-barlow text-xs uppercase tracking-[0.12em] text-stadium-muted">
          {t("onYouTube")}
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.link}>
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lfc-gold"
            >
              <div className="relative aspect-video overflow-hidden border border-stadium-border">
                <NewsThumb src={item.thumbnail} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
                <span
                  aria-hidden
                  className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors group-hover:bg-black/10"
                >
                  <span className="flex size-12 items-center justify-center rounded-full bg-lfc-red/90 text-white">
                    <Play className="size-5 translate-x-[1px]" fill="currentColor" />
                  </span>
                </span>
              </div>
              <h3 className="mt-2 font-inter text-sm font-semibold leading-snug text-white transition-colors group-hover:text-lfc-red-text">
                {item.title}
              </h3>
              <p className="mt-1 font-barlow text-xs uppercase tracking-[0.1em] text-stadium-muted">
                <LocalMatchDay iso={item.pubDate} locale={locale} />
              </p>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
