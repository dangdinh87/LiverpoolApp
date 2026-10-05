import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { LocaleParams } from "@/i18n/routing";
import { getSquadPlayers } from "@/lib/squad-data";
import { PageHero } from "@/components/ui/page-hero";
import { SquadGrid } from "@/components/squad/squad-grid";
import { makePageMeta, buildBreadcrumbJsonLd, getCanonical } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { getCurrentSeasonLabel } from "@/lib/football/current-season";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Squad.metadata" });
  const title = t("title");
  const description = t("description", { season: getCurrentSeasonLabel() });
  return { title, description, ...makePageMeta(title, description, { path: "/squad" }) };
}

export const revalidate = 86400; // season label is derived from the date

export default async function SquadPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Squad");

  // Slim the data: cards need no bios or honours, and everything passed here is shipped to the browser.
  const squadPlayers = getSquadPlayers({ includeLoans: true, includeForever: true }).map((p) => ({
    id: p.id,
    name: p.name,
    shirtNumber: p.shirtNumber,
    shirtName: p.shirtName,
    slug: p.slug,
    position: p.position,
    onLoan: p.onLoan,
    forever: p.forever,
    photo: p.photo,
    localPhoto: p.localPhoto,
  }));

  return (
    <div className="min-h-screen">
      <JsonLd data={buildBreadcrumbJsonLd([
        { name: "Home", url: getCanonical("/") },
        { name: "Squad", url: getCanonical("/squad") },
      ])} />
      <PageHero
        eyebrow={t("season", { season: getCurrentSeasonLabel() })}
        title={t("title")}
        description={t("count", { count: squadPlayers.length, n: squadPlayers.length })}
        image="/assets/lfc/stadium/anfield-pitch.webp"
      />
      <div className="page-container pb-16 pt-5 sm:pt-8">
        <SquadGrid players={squadPlayers} />
      </div>
    </div>
  );
}
