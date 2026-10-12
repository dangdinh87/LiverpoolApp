import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { makePageMeta } from "@/lib/seo";
import {
  formatSeasonLabel,
  getCurrentSeasonYear,
  isSelectableSeason,
} from "@/lib/football/current-season";
import { StatsSeasonView } from "@/components/stats/stats-season-view";

type Params = Promise<{ season: string; locale: string }>;

export const revalidate = 3600;

/**
 * Generated on first request, then cached — the convention this app already
 * uses for /news/digest/[date].
 *
 * The seasons are a short known list, so prerendering them all at build is
 * tempting, but each one fetches a season of fixtures plus two comparison
 * seasons from Football-Data.org, whose free tier allows 10 requests a minute.
 * A cold build has no data cache, so it would exhaust the quota and bake empty
 * pages in for an hour. Generating on demand spreads those calls out and still
 * serves every visitor after the first from the edge.
 */
export function generateStaticParams() {
  return [];
}

/** Only seasons the picker offers: an arbitrary year would spend API quota on a page nobody can reach. */
function parseSeason(raw: string): number | null {
  const year = Number.parseInt(raw, 10);
  if (!Number.isInteger(year) || !isSelectableSeason(year)) return null;
  // The current season is canonical at /stats; keep one URL per page.
  return year === getCurrentSeasonYear() ? null : year;
}

export async function generateMetadata({ params }: { params: Params }) {
  const { season, locale } = await params;
  const year = parseSeason(season);
  if (year === null) return { title: "Not Found", robots: { index: false } };
  const t = await getTranslations({ locale, namespace: "Stats.metadata" });
  const title = t("title");
  const description = t("description", { season: formatSeasonLabel(year) });
  return { title, description, ...makePageMeta(title, description, { locale, path: `/stats/${year}` }) };
}

export default async function ArchiveStatsPage({ params }: { params: Params }) {
  const { season, locale } = await params;
  const year = parseSeason(season);
  if (year === null) notFound();
  return <StatsSeasonView locale={locale} selectedSeason={year} />;
}
