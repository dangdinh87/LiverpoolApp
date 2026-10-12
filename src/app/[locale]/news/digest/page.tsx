import type { Metadata } from "next";
import { Newspaper } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import type { LocaleParams } from "@/i18n/routing";
import { unstable_cache } from "next/cache";
import { getLatestDigest } from "@/lib/news/digest";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { robots: { index: false } };

/**
 * The date of the newest briefing.
 *
 * Tagged `news-digest`, which /api/news/digest/generate already busts the
 * moment a briefing is written, so "none yet" is never served for longer than
 * it is true. This page used to be `force-dynamic` to get that freshness, which
 * meant every reader anywhere paid a server render in one region for what is a
 * redirect to a date that changes once a day.
 *
 * Errors are not caught in here: a throw is never written to the cache, so a
 * database failure is retried on the next request instead of being pinned as
 * "no digest" for an hour. The caller turns it into the error state.
 */
const getCachedLatestDigestDate = unstable_cache(
  async () => (await getLatestDigest())?.digest_date ?? null,
  ["news-digest-latest-date"],
  { revalidate: 1800, tags: ["news-digest"] },
);

export const revalidate = 1800;

/** /news/digest: jump to the newest briefing, or explain that none exists yet. */
export default async function DigestIndexPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("News.digest");

  let date: string | null = null;
  let failed = false;
  try {
    date = await getCachedLatestDigestDate();
  } catch {
    failed = true;
  }
  // redirect() throws, so it stays outside the try block.
  if (date) redirect({ href: `/news/digest/${date}`, locale });

  return (
    <div className="min-h-screen">
      <div className="page-container max-w-3xl pb-16 pt-[calc(var(--header-h)+1.5rem)]">
        <EmptyState
          tone={failed ? "error" : "empty"}
          icon={<Newspaper className="size-10" aria-hidden />}
          title={failed ? t("unavailableTitle") : t("notGeneratedTitle")}
          description={failed ? t("unavailableDesc") : t("notGeneratedDesc")}
          actionHref="/news"
          actionLabel={t("backToNews")}
        />
      </div>
    </div>
  );
}
