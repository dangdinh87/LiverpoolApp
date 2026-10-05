import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SOURCE_CONFIG, type NewsSource } from "@/lib/news-config";
import { ARTICLE_LEAD_CLASS, ARTICLE_TITLE_CLASS } from "./article-header";
import { isHttpUrl } from "./news-text";

interface ArticleLinkOutProps {
  url: string;
  title?: string;
  lead?: string;
  heroImage?: string;
  source: NewsSource | "unknown";
  sourceName: string;
}

/**
 * "Read this one on the source" page. Used when we cannot honestly show the
 * article in-app (video/live pages, link-out-only publishers, nothing extracted).
 * Always has a way forward: the big original-article button.
 */
export async function ArticleLinkOut({ url, title, lead, heroImage, source, sourceName }: ArticleLinkOutProps) {
  const t = await getTranslations("News.article");
  const cfg = source === "unknown" ? undefined : SOURCE_CONFIG[source];

  return (
    <div className="min-h-screen">
      <div className="page-container pb-16 pt-[calc(var(--header-h)+1rem)]">
        <Link
          href="/news"
          className="inline-flex min-h-11 items-center gap-2 font-barlow text-sm font-semibold uppercase tracking-[0.12em] text-stadium-muted transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t("backToNews")}
        </Link>

        <div className="reveal mt-2 max-w-3xl">
          <span className={`inline-flex px-2 py-1 font-barlow text-xs font-bold uppercase tracking-wider ${cfg?.color ?? "bg-zinc-700 text-zinc-100"}`}>
            {sourceName}
          </span>

          {title ? (
            <h1 className={`${ARTICLE_TITLE_CLASS} mt-4`}>{title}</h1>
          ) : (
            <h1 className={`${ARTICLE_TITLE_CLASS} mt-4`}>{t("contentUnavailable")}</h1>
          )}

          {isHttpUrl(heroImage) && (
            <div className="relative -mx-4 mt-6 aspect-video bg-[var(--surface-3)] sm:mx-0">
              <Image src={heroImage} alt="" fill priority sizes="(max-width: 768px) 100vw, 768px" unoptimized referrerPolicy="no-referrer" className="object-cover" />
            </div>
          )}

          {lead && <p className={ARTICLE_LEAD_CLASS}>{lead}</p>}

          <div className="surface mt-8 flex flex-col gap-4 p-5 sm:p-6">
            <p className="text-[15px] leading-relaxed text-stadium-muted">
              {title ? t("linkOutMsg", { source: sourceName }) : t("contentUnavailableDesc")}
            </p>
            {isHttpUrl(url) && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 bg-lfc-red px-6 font-barlow text-base font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-lfc-red-dark sm:self-start"
              >
                {t("readFullOn", { source: sourceName })}
                <ExternalLink className="size-4" aria-hidden />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
