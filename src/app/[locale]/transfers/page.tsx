import type { Metadata } from "next";
import Image from "next/image";
import { unstable_cache } from "next/cache";
import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { LocaleParams } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getAllPlayers, getPlayerSlugByName, getSquadPlayers, type LfcPlayer } from "@/lib/squad-data";
import { playerSurname } from "@/lib/player-surname";
import { getNationality } from "@/lib/nationality";
import { getCachedNewsFeed } from "@/lib/news/cached-feed";
import { getLatestDigest } from "@/lib/news/digest";
import { getDigestHeadline } from "@/lib/news/latest-digest";
import { cleanTitle } from "@/components/news/news-text";
import { PageHero } from "@/components/ui/page-hero";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { NewsCard } from "@/components/news/news-card";
import { DataPulseStrip, PresetConnectedGrid, SectionSubNav } from "@/components/ui/hub-links";
import { JsonLd } from "@/components/seo/json-ld";
import { buildLocalizedBreadcrumbJsonLd } from "@/lib/seo-breadcrumbs";
import { makePageMeta } from "@/lib/seo";

export const revalidate = 21600; // 6h — matches news-feed-v1 & transfers-digest-v1 cache TTLs

const getCachedTransfersDigest = unstable_cache(
  async () => getLatestDigest(),
  ["transfers-digest-v1"],
  { revalidate: 21600, tags: ["news-digest"] },
);

function findMentionedPlayers(title: string, players: LfcPlayer[]): LfcPlayer[] {
  const lower = title.toLowerCase();
  return players.filter((p) => {
    if (lower.includes(p.name.toLowerCase())) return true;
    const surname = playerSurname(p.name);
    if (surname.length < 4) return false;
    const escaped = surname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(title);
  }).slice(0, 3);
}

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

  const [t, tNat, tHub, feed, digest, breadcrumbJsonLd] = await Promise.all([
    getTranslations({ locale, namespace: "Transfers" }),
    getTranslations({ locale, namespace: "PlayerDetail.nationalities" }),
    getTranslations({ locale, namespace: "Hub" }),
    getCachedNewsFeed(100).catch(() => []),
    getCachedTransfersDigest().catch(() => null),
    buildLocalizedBreadcrumbJsonLd(locale, [{ nav: "transfers", path: "/transfers" }]),
  ]);

  const transferNews = feed.filter((a) => a.category === "transfer").slice(0, 12);
  const allPlayers = getAllPlayers();
  const activeSquadCount = getSquadPlayers().length;
  const onLoanPlayers = allPlayers.filter((p) => p.onLoan);
  const digestHeadline = digest ? cleanTitle(getDigestHeadline(digest)) : null;
  const nowMs = new Date().getTime();

  return (
    <div className="min-h-screen bg-stadium-bg">
      <JsonLd data={breadcrumbJsonLd} />
      <PageHero
        clubCrest
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        description={t("hero.description")}
      />

      <SectionSubNav
        group="club"
        current="transfers"
      />

      <div className="page-container space-y-10 pb-20 pt-8 sm:pt-10">

          <DataPulseStrip
            eyebrow={tHub("seasonPulse")}
            items={[
              {
                label: tHub("metrics.squadSize"),
                value: activeSquadCount,
                sublabel: tHub("cards.squad.badge"),
                href: "/squad",
                accent: "red",
              },
              ...(onLoanPlayers.length > 0
                ? [
                    {
                      label: tHub("metrics.onLoan"),
                      value: onLoanPlayers.length,
                      sublabel: tHub("cards.squad.title"),
                      href: "/squad",
                      accent: "gold" as const,
                    },
                  ]
                : []),
              ...(transferNews.length > 0
                ? [
                    {
                      label: tHub("cards.transfers.badge"),
                      value: transferNews.length,
                      sublabel: tHub("nav.news"),
                      href: "/news",
                      accent: "red" as const,
                    },
                  ]
                : []),
              ...(digest
                ? [
                    {
                      label: tHub("nav.digest"),
                      value: digest.digest_date,
                      sublabel: tHub("cards.digest.title"),
                      href: `/news/digest/${digest.digest_date}`,
                      accent: "gold" as const,
                    },
                  ]
                : []),
            ]}
          />

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
            <SectionHeader title={t("sections.news")} href="/news" linkLabel={t("browseNews")} />
            {transferNews.length === 0 ? (
              <EmptyState
                title={t("empty.title")}
                description={t("empty.description")}
                actionHref="/news"
                actionLabel={t("browseNews")}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {transferNews.map((article) => {
                  const matchedPlayers = findMentionedPlayers(cleanTitle(article.title), allPlayers);
                  return (
                    <div key={article.link} className="flex flex-col">
                      <NewsCard article={article} nowMs={nowMs} variant="tile" />
                      {matchedPlayers.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {matchedPlayers.map((p) => {
                            const slug = getPlayerSlugByName(p.name);
                            if (!slug) return null;
                            return (
                              <Link
                                key={slug}
                                href={`/player/${slug}`}
                                className="inline-flex items-center gap-1 border border-stadium-border bg-stadium-surface px-2.5 py-1 font-barlow text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:border-lfc-gold hover:text-lfc-gold"
                              >
                                {p.shirtNumber > 0 && <span className="text-lfc-gold tabular-nums">#{p.shirtNumber}</span>}
                                <span>{p.name}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {onLoanPlayers.length > 0 && (
            <section aria-label={t("sections.onLoan")}>
              <SectionHeader title={t("sections.onLoan")} href="/squad" linkLabel={t("viewSquad")} />
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {onLoanPlayers.map((player) => {
                  const nat = getNationality(player.nationality);
                  const natLabel = nat.key ? tNat(nat.key) : player.nationality;
                  const slug = getPlayerSlugByName(player.name) ?? player.slug;
                  return (
                    <li key={slug}>
                      <Link
                        href={`/player/${slug}`}
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
                            {player.shirtNumber > 0 ? `#${player.shirtNumber} · ` : ""}
                            {nat.flag} {natLabel}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <PresetConnectedGrid
            preset="fromTransfers"
            metaOverrides={{
              squad: `${onLoanPlayers.length} ${tHub("metrics.onLoan")}`,
              digest: digest?.digest_date,
            }}
          />
      </div>
    </div>
  );
}
