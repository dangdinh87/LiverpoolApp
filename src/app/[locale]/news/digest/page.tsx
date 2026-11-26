import type { Metadata } from "next";
import { Newspaper } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import type { LocaleParams } from "@/i18n/routing";
import { unstable_cache } from "next/cache";
import { getLatestDigest } from "@/lib/news/digest";
import { getStandings } from "@/lib/football";
import { getCachedFixtures } from "@/lib/football/cached-fixtures";
import { FOOTBALL_CACHE_TAG } from "@/lib/football/cache-tags";
import { requireNonEmptyArray } from "@/lib/football/fdo-client";
import { defaultTimeZoneForLocale, formatMatchDate } from "@/lib/format-match-date";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHero } from "@/components/ui/page-hero";
import { DataPulseStrip, PresetConnectedGrid, SectionSubNav } from "@/components/ui/hub-links";
import { BRAND } from "@/lib/brand";

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
  { revalidate: 21600, tags: ["news-digest"] },
);

const getCachedDigestStandings = unstable_cache(
  async () => requireNonEmptyArray(getStandings()),
  ["digest-index-standings-v1"],
  { revalidate: 21600, tags: [FOOTBALL_CACHE_TAG] },
);

// 6 hours: the digest is generated once a day and /api/news/digest/generate
// busts the "news-digest" tag, so a new briefing appears without waiting.
export const revalidate = 21600;

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

  const uiLocale: "vi" | "en" = locale === "vi" ? "vi" : "en";
  const [tHub, fixtures, standings] = await Promise.all([
    getTranslations("Hub"),
    getCachedFixtures().catch(() => []),
    getCachedDigestStandings().catch(() => []),
  ]);

  const nextMatch =
    [...fixtures]
      .filter((f) => f.fixture.status.short === "NS")
      .sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime())[0] ??
    [...fixtures]
      .filter((f) => ["FT", "AET", "PEN"].includes(f.fixture.status.short))
      .sort((a, b) => new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime())[0] ??
    null;
  const opponent = nextMatch ? (nextMatch.teams.home.id === 40 ? nextMatch.teams.away : nextMatch.teams.home) : null;
  const lfcStanding = standings.find((s) => s.team.id === 40) ?? null;

  return (
    <div className="min-h-screen">
      <PageHero
        clubCrest
        eyebrow={t("proBadge", { brand: BRAND.name })}
        title={failed ? t("unavailableTitle") : t("notGeneratedTitle")}
        description={failed ? t("unavailableDesc") : t("notGeneratedDesc")}
      />
      <SectionSubNav group="editorial" current="digest" />
      <div className="page-container pb-20 pt-8 sm:pt-10">
        <EmptyState
          tone={failed ? "error" : "empty"}
          icon={<Newspaper className="size-10" aria-hidden />}
          title={failed ? t("unavailableTitle") : t("notGeneratedTitle")}
          description={failed ? t("unavailableDesc") : t("notGeneratedDesc")}
          actionHref="/news"
          actionLabel={t("backToNews")}
        />
        <DataPulseStrip
          eyebrow={tHub("seasonPulse")}
          className="mt-10"
          items={[
            {
              label: tHub("metrics.nextMatch"),
              value: opponent
                ? `${nextMatch?.teams.home.id === 40 ? "vs" : "@"} ${opponent.name}`
                : tHub("nav.fixtures"),
              sublabel: nextMatch
                ? formatMatchDate(new Date(nextMatch.fixture.date), uiLocale, defaultTimeZoneForLocale(uiLocale))
                : tHub("cards.fixtures.badge"),
              href: nextMatch ? `/fixtures/${nextMatch.fixture.id}` : "/fixtures",
              accent: "red",
            },
            {
              label: tHub("metrics.plRank"),
              value: lfcStanding ? `#${lfcStanding.rank}` : tHub("nav.standings"),
              sublabel: lfcStanding
                ? `${lfcStanding.points} · ${lfcStanding.goalsDiff >= 0 ? `+${lfcStanding.goalsDiff}` : lfcStanding.goalsDiff}`
                : tHub("cards.standings.badge"),
              href: "/standings",
              accent: "gold",
            },
            {
              label: tHub("nav.analysis"),
              value: tHub("cards.analysis.badge"),
              sublabel: tHub("cards.analysis.title"),
              href: "/analysis",
              accent: "red",
            },
          ]}
        />
        <PresetConnectedGrid preset="fromDigest" className="mt-10" />
      </div>
    </div>
  );
}
