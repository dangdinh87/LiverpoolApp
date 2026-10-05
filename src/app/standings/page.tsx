import { getTranslations } from "next-intl/server";
import { getStandings } from "@/lib/football";
import { PageHero } from "@/components/ui/page-hero";
import { StandingsTable } from "@/components/standings/standings-table";
import { makePageMeta, buildBreadcrumbJsonLd, getCanonical } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { getCurrentSeasonLabel } from "@/lib/football/current-season";

export async function generateMetadata() {
  const t = await getTranslations("Standings.metadata");
  const title = t("title");
  const description = t("description", { season: getCurrentSeasonLabel() });
  return { title, description, ...makePageMeta(title, description, { path: "/standings" }) };
}

export const revalidate = 21600; // 6 hours

export default async function StandingsPage() {
  const t = await getTranslations("Standings");
  const standings = await getStandings();

  // Find Liverpool's position for the header
  const lfcStanding = standings.find((s) => s.team.id === 40);

  const suffix = lfcStanding
    ? t(`hero.suffixes.${lfcStanding.rank === 1 ? "st" : lfcStanding.rank === 2 ? "nd" : lfcStanding.rank === 3 ? "rd" : "th"}`)
    : "";

  return (
    <div className="min-h-screen">
      <JsonLd data={buildBreadcrumbJsonLd([
        { name: "Home", url: getCanonical("/") },
        { name: "Standings", url: getCanonical("/standings") },
      ])} />
      <PageHero
        eyebrow={t("hero.season", { season: getCurrentSeasonLabel() })}
        title={t("hero.title")}
        description={
          lfcStanding
            ? `${t("hero.lfcPosition", { rank: lfcStanding.rank, suffix })} · ${t("hero.points", { count: lfcStanding.points })}`
            : t("description")
        }
        image="/assets/lfc/stadium/anfield-corner-flag.webp"
      />

      <div className="page-container pb-16 pt-4 sm:pt-6">
        <StandingsTable standings={standings} />
      </div>
    </div>
  );
}
