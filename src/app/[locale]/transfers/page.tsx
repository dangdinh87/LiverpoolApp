import type { Metadata } from "next";
import Image from "next/image";
import { unstable_cache } from "next/cache";
import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { LocaleParams } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getAllPlayers } from "@/lib/squad-data";
import { getCachedNewsFeed } from "@/lib/news/cached-feed";
import { getLatestDigest, getSeoArticleFromDigest } from "@/lib/news/digest";
import { PageHero } from "@/components/ui/page-hero";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { NewsCard } from "@/components/news/news-card";
import { JsonLd } from "@/components/seo/json-ld";
import { buildLocalizedBreadcrumbJsonLd } from "@/lib/seo-breadcrumbs";
import { makePageMeta } from "@/lib/seo";

export const revalidate = 21600; // 6h — matches news-feed-v1 & transfers-digest-v1 cache TTLs

const getCachedTransfersDigest = unstable_cache(
  async () => getLatestDigest(),
  ["transfers-digest-v1"],
  { revalidate: 21600, tags: ["news-digest"] },
);

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Transfers.metadata" });
  const title = t("title");
  const description = t("description");
  return { title, description, ...makePageMeta(title, description, { locale, path: "/transfers" }) };
}

export default async function TransfersPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, feed, digest, breadcrumbJsonLd] = await Promise.all([
    getTranslations({ locale, namespace: "Transfers" }),
    getCachedNewsFeed(100).catch(() => []),
    getCachedTransfersDigest().catch(() => null),
    buildLocalizedBreadcrumbJsonLd(locale, [{ nav: "transfers", path: "/transfers" }]),
  ]);

  const transferNews = feed.filter((a) => a.category === "transfer").slice(0, 12);
  const onLoanPlayers = getAllPlayers().filter((p) => p.onLoan);
  const digestHeadline = digest ? getSeoArticleFromDigest(digest)?.title || digest.title : null;
  const nowMs = new Date().getTime();

  return (
    <div className="min-h-screen bg-stadium-bg pb-16">
      <JsonLd data={breadcrumbJsonLd} />
      <PageHero
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        description={t("hero.description")}
      />

      <div className="page-container pt-6 sm:pt-8">
        <div className="mx-auto max-w-4xl space-y-10">
          {digest && digestHeadline && (
            <Link
              href={`/news/digest/${digest.digest_date}`}
              className="surface tap-target group flex items-center justify-between gap-4 p-4 transition-colors hover:border-white/25 sm:p-5"
            >
              <div className="min-w-0">
                <span className="section-label text-lfc-gold">{t("sections.digest")}</span>
                <p className="mt-1 truncate font-serif text-lg font-semibold text-white group-hover:underline">
                  {digestHeadline}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 font-barlow text-sm font-semibold uppercase tracking-[0.12em] text-white group-hover:text-lfc-gold">
                {t("digestCta")}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          )}

          <section aria-label={t("sections.news")}>
            <SectionHeader title={t("sections.news")} href="/news" />
            {transferNews.length === 0 ? (
              <EmptyState
                title={t("empty.title")}
                description={t("empty.description")}
                actionHref="/news"
                actionLabel={t("viewSquad")}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {transferNews.map((article) => (
                  <NewsCard key={article.link} article={article} nowMs={nowMs} variant="tile" />
                ))}
              </div>
            )}
          </section>

          {onLoanPlayers.length > 0 && (
            <section aria-label={t("sections.onLoan")}>
              <SectionHeader title={t("sections.onLoan")} href="/squad" linkLabel={t("viewSquad")} />
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {onLoanPlayers.map((player) => (
                  <li key={player.slug}>
                    <Link
                      href={`/player/${player.slug}`}
                      className="surface tap-target group flex items-center gap-3 p-3.5 transition-colors hover:border-white/25"
                    >
                      <div className="relative size-12 shrink-0 overflow-hidden bg-[var(--surface-3)]">
                        <Image
                          src={player.localPhoto || player.photo}
                          alt={player.name}
                          fill
                          sizes="48px"
                          className="object-cover object-top"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bebas text-xl tracking-wide text-white group-hover:text-lfc-gold">
                          {player.name}
                        </p>
                        <p className="text-xs text-stadium-muted">
                          #{player.shirtNumber} · {player.nationality}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
