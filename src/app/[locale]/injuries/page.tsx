import type { Metadata } from "next";
import Image from "next/image";
import { Activity, ArrowRight, CheckCircle2 } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { LocaleParams } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getSquadPlayers, type LfcPlayer } from "@/lib/squad-data";
import { findFplMatch, getAllFplStats, type FplPlayerStats } from "@/lib/football";
import { getCachedNewsFeed } from "@/lib/news/cached-feed";
import { PageHero } from "@/components/ui/page-hero";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { NewsCard } from "@/components/news/news-card";
import { JsonLd } from "@/components/seo/json-ld";
import { buildLocalizedBreadcrumbJsonLd } from "@/lib/seo-breadcrumbs";
import { makePageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const revalidate = 21600; // 6h — matches FPL stats & news-feed-v1 cache TTLs

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Injuries.metadata" });
  const title = t("title");
  const description = t("description");
  return { title, description, ...makePageMeta(title, description, { locale, path: "/injuries" }) };
}

type StatusKey = "injured" | "doubtful" | "suspended" | "unavailable";

function mapFplStatus(status: string, chance: number | null): StatusKey {
  if (status === "s") return "suspended";
  if (status === "d" || (chance !== null && chance > 0 && chance < 100)) return "doubtful";
  if (status === "u" || status === "n") return "unavailable";
  return "injured";
}

const STATUS_STYLE: Record<StatusKey, string> = {
  injured: "border-lfc-red/40 bg-lfc-red/15 text-brand",
  suspended: "border-lfc-red/40 bg-lfc-red/15 text-brand",
  doubtful: "border-lfc-gold/40 bg-lfc-gold/15 text-lfc-gold",
  unavailable: "border-white/20 bg-white/10 text-white/80",
};

interface FlaggedPlayer {
  player: LfcPlayer;
  fpl: FplPlayerStats;
  statusKey: StatusKey;
}

export default async function InjuriesPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, fplStats, feed, breadcrumbJsonLd] = await Promise.all([
    getTranslations({ locale, namespace: "Injuries" }),
    getAllFplStats(),
    getCachedNewsFeed(100).catch(() => []),
    buildLocalizedBreadcrumbJsonLd(locale, [{ nav: "injuries", path: "/injuries" }]),
  ]);

  const squadPlayers = getSquadPlayers();
  const flagged: FlaggedPlayer[] = [];
  let availableCount = 0;

  for (const player of squadPlayers) {
    const fpl = findFplMatch(player.name, fplStats);
    if (!fpl) {
      availableCount += 1;
      continue;
    }
    const hasFlag =
      fpl.status !== "a" ||
      (fpl.chanceOfPlayingNextRound !== null && fpl.chanceOfPlayingNextRound < 100) ||
      fpl.news.trim().length > 0;
    if (hasFlag) {
      flagged.push({
        player,
        fpl,
        statusKey: mapFplStatus(fpl.status, fpl.chanceOfPlayingNextRound),
      });
    } else {
      availableCount += 1;
    }
  }

  const injuryNews = feed.filter((a) => a.category === "injury").slice(0, 8);
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
          {/* Availability summary */}
          <div className="surface flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-2 font-semibold text-white">
                <Activity className="size-4 text-lfc-red" aria-hidden />
                {t("summary.sidelined", { count: flagged.length })}
              </span>
              <span className="text-stadium-muted">
                {t("summary.available", { count: availableCount })}
              </span>
            </div>
            <Link
              href="/squad"
              className="tap-target inline-flex items-center gap-1.5 font-barlow text-xs font-semibold uppercase tracking-[0.12em] text-stadium-muted transition-colors hover:text-white"
            >
              {t("viewSquad")}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>

          <section aria-label={t("sections.sidelined")}>
            <SectionHeader title={t("sections.sidelined")} />
            {flagged.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="size-8 text-green-400" aria-hidden />}
                title={t("empty.title")}
                description={t("empty.description")}
                actionHref="/squad"
                actionLabel={t("viewSquad")}
              />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {flagged.map(({ player, fpl, statusKey }) => (
                  <li key={player.slug}>
                    <Link
                      href={`/player/${player.slug}`}
                      className="surface tap-target group flex items-start gap-3.5 p-4 transition-colors hover:border-white/25"
                    >
                      <div className="relative size-14 shrink-0 overflow-hidden bg-[var(--surface-3)]">
                        <Image
                          src={player.localPhoto || player.photo}
                          alt={player.name}
                          fill
                          sizes="56px"
                          className="object-cover object-top"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bebas text-2xl leading-none tracking-wide text-white group-hover:text-lfc-gold">
                            {player.name}
                          </span>
                          {player.shirtNumber > 0 && (
                            <span className="font-barlow text-xs font-semibold text-stadium-muted">
                              #{player.shirtNumber}
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "inline-block border px-2 py-0.5 font-barlow text-[11px] font-semibold uppercase tracking-wider",
                              STATUS_STYLE[statusKey],
                            )}
                          >
                            {t(`status.${statusKey}`)}
                          </span>
                          {fpl.chanceOfPlayingNextRound !== null && fpl.chanceOfPlayingNextRound < 100 && (
                            <span className="text-xs text-stadium-muted">
                              {t("chanceOfPlaying", { pct: fpl.chanceOfPlayingNextRound })}
                            </span>
                          )}
                        </div>
                        {fpl.news.trim() && (
                          <p className="mt-2 text-sm leading-snug text-white/80">{fpl.news.trim()}</p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {injuryNews.length > 0 && (
            <section aria-label={t("sections.news")}>
              <SectionHeader title={t("sections.news")} href="/news" />
              <div className="grid gap-4 sm:grid-cols-2">
                {injuryNews.map((article) => (
                  <NewsCard key={article.link} article={article} nowMs={nowMs} variant="tile" />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
