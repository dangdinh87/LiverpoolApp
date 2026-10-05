import type { Metadata } from "next";
import { Newspaper } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import type { LocaleParams } from "@/i18n/routing";
import { getLatestDigest } from "@/lib/news/digest";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { robots: { index: false } };

// Always resolves the newest briefing at request time; never cached as "no digest".
export const dynamic = "force-dynamic";

/** /news/digest: jump to the newest briefing, or explain that none exists yet. */
export default async function DigestIndexPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("News.digest");

  let date: string | null = null;
  let failed = false;
  try {
    date = (await getLatestDigest())?.digest_date ?? null;
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
