import type { Metadata } from "next";
import { getFixtures } from "@/lib/api-football";
import { FixtureTimeline } from "@/components/fixtures/fixture-timeline";

export const metadata: Metadata = {
  title: "Fixtures & Results",
  description: "Liverpool FC fixtures and results for the 2024/25 season.",
};

// ISR: revalidate fixtures every 1h
export const revalidate = 3600;

export default async function FixturesPage() {
  const fixtures = await getFixtures();

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-10">
          <p className="font-barlow text-lfc-red uppercase tracking-widest text-sm font-semibold mb-2">
            2024/25 Season
          </p>
          <h1 className="font-bebas text-6xl md:text-7xl text-white tracking-wider leading-none mb-3">
            Fixtures & Results
          </h1>
          <p className="text-stadium-muted font-inter">
            {fixtures.length} matches · Liverpool FC
          </p>
        </div>

        {/* Timeline with filter */}
        <FixtureTimeline fixtures={fixtures} />
      </div>
    </div>
  );
}
