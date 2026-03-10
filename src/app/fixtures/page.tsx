import { getTranslations } from "next-intl/server";
import { getFixtures } from "@/lib/football";
import { FixtureTimeline } from "@/components/fixtures/fixture-timeline";

export async function generateMetadata() {
  const t = await getTranslations("Fixtures.metadata");
  return {
    title: t("title"),
    description: t("description"),
  };
}

// ISR: revalidate fixtures every 1h
export const revalidate = 3600;

export default async function FixturesPage() {
  const t = await getTranslations("Fixtures");
  const fixtures = await getFixtures();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative h-[40vh] min-h-[320px] flex items-end">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/lfc/stadium/anfield-champions-league.webp')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stadium-bg via-stadium-bg/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-stadium-bg/80 to-transparent" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 w-full">
          <p className="font-barlow text-lfc-red uppercase tracking-widest text-sm font-semibold mb-2">
            {t("hero.season")}
          </p>
          <h1 className="font-bebas text-7xl md:text-8xl text-white tracking-wider leading-none mb-3">
            {t("hero.title")}
          </h1>
          <p className="font-inter text-stadium-muted">
            {t("hero.subtitle", { count: fixtures.length })}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16">
        {/* Timeline with filter */}
        <FixtureTimeline fixtures={fixtures} />
      </div>
    </div>
  );
}
