import { getTranslations } from "next-intl/server";
import type { LocaleParams } from "@/i18n/routing";
import { makePageMeta } from "@/lib/seo";
import { getCurrentSeasonLabel, getCurrentSeasonYear } from "@/lib/football/current-season";
import { StatsSeasonView } from "@/components/stats/stats-season-view";

export async function generateMetadata({ params }: LocaleParams) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Stats.metadata" });
  const title = t("title");
  const description = t("description", { season: getCurrentSeasonLabel() });
  return { title, description, ...makePageMeta(title, description, { locale, path: "/stats" }) };
}

export const revalidate = 3600; // 1 hour

/**
 * The current season's stats, prerendered.
 *
 * The archive lives at /stats/[season]. This page took `?season=` instead,
 * which made it render on demand for every visitor even though almost nobody
 * arrives with the parameter set.
 */
export default async function StatsPage({ params }: LocaleParams) {
  const { locale } = await params;
  return <StatsSeasonView locale={locale} selectedSeason={getCurrentSeasonYear()} />;
}
