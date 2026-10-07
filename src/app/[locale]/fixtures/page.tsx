import { getTranslations, setRequestLocale } from "next-intl/server";
import type { LocaleParams } from "@/i18n/routing";
import { getFixtures } from "@/lib/football";
import { CloudOff } from "lucide-react";
import { FixtureTimeline } from "@/components/fixtures/fixture-timeline";
import { MatchCentreNav } from "@/components/fixtures/match-centre-nav";
import { PageHero } from "@/components/ui/page-hero";
import { EmptyState } from "@/components/ui/empty-state";
import { makePageMeta, buildBreadcrumbJsonLd, getCanonical } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { getCurrentSeasonLabel } from "@/lib/football/current-season";

export async function generateMetadata({ params }: LocaleParams) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Fixtures.metadata" });
  const title = t("title");
  const description = t("description", { season: getCurrentSeasonLabel() });
  return { title, description, ...makePageMeta(title, description, { path: "/fixtures" }) };
}

// Static page: the ?view=results deep link is handled in FixtureTimeline on the
// client, so nothing here reads the request and the route can be cached.
export const revalidate = 1800;

export default async function FixturesPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Fixtures");
  const fixtures = await getFixtures();

  return (
    <div className="min-h-screen">
      <JsonLd data={buildBreadcrumbJsonLd([
        { name: "Home", url: getCanonical("/") },
        { name: "Fixtures", url: getCanonical("/fixtures") },
      ])} />
      <PageHero
        eyebrow={t("hero.season", { season: getCurrentSeasonLabel() })}
        title={t("hero.title")}
        description={t("hero.subtitle", { count: fixtures.length })}
        image="/assets/lfc/stadium/anfield-champions-league.webp"
      />

      <div className="page-container pb-16">
        {fixtures.length > 0 ? (
          <FixtureTimeline
            fixtures={fixtures}
            showArchiveLink
          />
        ) : (
          <>
            <MatchCentreNav active="fixtures" />
            <EmptyState
              className="mt-6"
              tone="error"
              icon={<CloudOff className="size-9" aria-hidden />}
              title={t("outage.title")}
              description={t("outage.description")}
              actionHref="/news"
              actionLabel={t("outage.action")}
            />
          </>
        )}
      </div>
    </div>
  );
}
