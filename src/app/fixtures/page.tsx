import { getTranslations } from "next-intl/server";
import { getFixtures } from "@/lib/football";
import { CloudOff } from "lucide-react";
import { FixtureTimeline } from "@/components/fixtures/fixture-timeline";
import { PageHero } from "@/components/ui/page-hero";
import { EmptyState } from "@/components/ui/empty-state";
import { makePageMeta, buildBreadcrumbJsonLd, getCanonical } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { getCurrentSeasonLabel } from "@/lib/football/current-season";

export async function generateMetadata() {
  const t = await getTranslations("Fixtures.metadata");
  const title = t("title");
  const description = t("description", { season: getCurrentSeasonLabel() });
  return { title, description, ...makePageMeta(title, description, { path: "/fixtures" }) };
}

export const revalidate = 1800; // 30 minutes

export default async function FixturesPage() {
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

      <div className="page-container pb-16 pt-4 sm:pt-6">
        {fixtures.length > 0 ? (
          <FixtureTimeline fixtures={fixtures} />
        ) : (
          <EmptyState
            tone="error"
            icon={<CloudOff className="size-9" aria-hidden />}
            title={t("outage.title")}
            description={t("outage.description")}
            actionHref="/news"
            actionLabel={t("outage.action")}
          />
        )}
      </div>
    </div>
  );
}
