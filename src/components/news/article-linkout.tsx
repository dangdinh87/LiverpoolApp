import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ARTICLE_LEAD_CLASS, ARTICLE_TITLE_CLASS } from "./article-header";
import { NewsBackLink, OriginalLinkButton, SourceBadge } from "./article-parts";
import { isHttpUrl } from "./news-text";

interface ArticleLinkOutProps {
  url: string;
  title?: string;
  lead?: string;
  heroImage?: string;
  sourceName: string;
}

/**
 * "Read this one on the source" page. Used when we cannot honestly show the
 * article in-app (video/live pages, link-out-only publishers, nothing extracted).
 * Always has a way forward: the big original-article button, right under the headline.
 */
export async function ArticleLinkOut({ url, title, lead, heroImage, sourceName }: ArticleLinkOutProps) {
  const t = await getTranslations("News.article");

  return (
    <div className="min-h-screen">
      <div className="page-container max-w-3xl pb-16 pt-[calc(var(--header-h)+1rem)]">
        <NewsBackLink label={t("backToNews")} />

        <div className="reveal mt-2">
          <SourceBadge name={sourceName} />
          <h1 className={`${ARTICLE_TITLE_CLASS} mt-4`}>{title || t("contentUnavailable")}</h1>
          {lead && <p className={ARTICLE_LEAD_CLASS}>{lead}</p>}

          <div className="mt-6">
            <OriginalLinkButton
              url={url}
              label={t("readOriginalOn", { source: sourceName })}
              hint={title ? t("linkOutMsg", { source: sourceName }) : t("contentUnavailableDesc")}
            />
          </div>

          {isHttpUrl(heroImage) && (
            <div className="relative -mx-4 mt-8 aspect-[2/1] bg-[var(--surface-3)] sm:mx-0 sm:aspect-video">
              <Image src={heroImage} alt="" fill sizes="(max-width: 768px) 100vw, 768px" unoptimized referrerPolicy="no-referrer" className="object-cover" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
