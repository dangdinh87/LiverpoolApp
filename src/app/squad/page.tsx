import type { Metadata } from "next";
import { getSquad } from "@/lib/api-football";
import { SquadGrid } from "@/components/squad/squad-grid";

export const metadata: Metadata = {
  title: "Squad",
  description: "Liverpool FC first-team squad for the 2024/25 season.",
};

// ISR: revalidate squad data every 24h
export const revalidate = 86400;

export default async function SquadPage() {
  const players = await getSquad();

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-10">
          <p className="font-barlow text-lfc-red uppercase tracking-widest text-sm font-semibold mb-2">
            2024/25 Season
          </p>
          <h1 className="font-bebas text-6xl md:text-7xl text-white tracking-wider leading-none mb-3">
            The Squad
          </h1>
          <p className="text-stadium-muted font-inter">
            {players.length} players · Liverpool FC
          </p>
        </div>

        {/* Squad grid with position filter */}
        <SquadGrid players={players} />
      </div>
    </div>
  );
}
