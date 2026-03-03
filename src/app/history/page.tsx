import type { Metadata } from "next";
import trophies from "@/data/trophies.json";
import historyEvents from "@/data/history.json";
import legends from "@/data/legends.json";
import { TrophyCabinet } from "@/components/history/trophy-cabinet";
import { ClubTimeline } from "@/components/history/club-timeline";
import { LegendCard } from "@/components/history/legend-card";

export const metadata: Metadata = {
  title: "History",
  description:
    "Liverpool FC's rich history — 19 league titles, 6 European Cups, legends, milestones and more.",
};

// Fully static — no API calls
export const dynamic = "force-static";

function SectionHeader({ label, title }: { label: string; title: string }) {
  return (
    <div className="mb-10">
      <p className="font-barlow text-lfc-red uppercase tracking-widest text-sm font-semibold mb-1">
        {label}
      </p>
      <h2 className="font-bebas text-5xl md:text-6xl text-white tracking-wider leading-none">
        {title}
      </h2>
    </div>
  );
}

export default function HistoryPage() {
  const totalTrophies = trophies.reduce((s, t) => s + t.count, 0);

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Page header */}
        <div className="mb-16">
          <p className="font-barlow text-lfc-red uppercase tracking-widest text-sm font-semibold mb-2">
            Est. 1892
          </p>
          <h1 className="font-bebas text-7xl md:text-8xl text-white tracking-wider leading-none mb-4">
            Our History
          </h1>
          <p className="font-inter text-stadium-muted max-w-xl leading-relaxed">
            Over 130 years of football. {totalTrophies} major trophies. Countless memories.
            This is the story of Liverpool Football Club.
          </p>
        </div>

        {/* ── Trophy Cabinet ────────────────────────────── */}
        <section className="mb-24">
          <SectionHeader label="Honours" title="Trophy Cabinet" />
          <TrophyCabinet trophies={trophies} />
        </section>

        {/* ── Club Timeline ─────────────────────────────── */}
        <section className="mb-24">
          <SectionHeader label="Key Moments" title="Club Timeline" />
          <ClubTimeline events={historyEvents} />
        </section>

        {/* ── Legends ───────────────────────────────────── */}
        <section>
          <SectionHeader label="Icons of Anfield" title="Legends" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {legends.map((legend) => (
              <LegendCard key={legend.name} legend={legend} />
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
