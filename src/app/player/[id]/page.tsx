import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPlayerStats, getSquad } from "@/lib/api-football";
import { POSITION_LABELS } from "@/lib/types/football";

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ id: string }>;
}

// Pre-generate static pages for all squad members at build time
export async function generateStaticParams() {
  try {
    const players = await getSquad();
    return players.map((p) => ({ id: String(p.id) }));
  } catch {
    // If API is unavailable at build time, skip static generation
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getPlayerStats(Number(id));
  if (!data) return { title: "Player" };
  return {
    title: data.player.name,
    description: `${data.player.name} — ${data.player.position} at Liverpool FC.`,
  };
}

export default async function PlayerPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getPlayerStats(Number(id));

  if (!data) notFound();

  const { player, statistics } = data;
  // Use stats from first entry (should be PL season)
  const stats = statistics[0];

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back nav */}
        <Link
          href="/squad"
          className="inline-flex items-center gap-2 text-stadium-muted hover:text-white font-inter text-sm mb-8 transition-colors group"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          Back to Squad
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left: photo + basic info */}
          <div className="md:col-span-1">
            <div className="relative bg-stadium-surface rounded-2xl overflow-hidden border border-stadium-border">
              {/* Jersey number watermark */}
              {player.number && (
                <span
                  className="absolute bottom-0 right-0 font-bebas text-white leading-none pointer-events-none select-none"
                  style={{ fontSize: "10rem", opacity: 0.04 }}
                  aria-hidden="true"
                >
                  {player.number}
                </span>
              )}

              <div className="relative h-72">
                <Image
                  src={player.photo}
                  alt={player.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-contain object-bottom"
                  priority
                />
              </div>

              <div className="p-5">
                <p className="font-barlow text-lfc-red uppercase tracking-widest text-xs font-semibold mb-1">
                  {POSITION_LABELS[player.position]} · #{player.number ?? "—"}
                </p>
                <h1 className="font-bebas text-4xl text-white tracking-wider leading-tight mb-3">
                  {player.name}
                </h1>

                <dl className="space-y-2 text-sm font-inter">
                  {[
                    ["Nationality", player.nationality],
                    ["Age", `${player.age} years`],
                    ["Height", player.height ?? "—"],
                    ["Weight", player.weight ?? "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between">
                      <dt className="text-stadium-muted">{label}</dt>
                      <dd className="text-white font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>

          {/* Right: season stats */}
          <div className="md:col-span-2">
            <h2 className="font-bebas text-3xl text-white tracking-wider mb-6">
              2024/25 Season Stats
            </h2>

            {stats ? (
              <>
                {/* Big number stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                  {[
                    { label: "Appearances", value: stats.games.appearences ?? 0 },
                    { label: "Goals", value: stats.goals.total ?? 0 },
                    { label: "Assists", value: stats.goals.assists ?? 0 },
                    { label: "Minutes", value: stats.games.minutes ?? 0 },
                    { label: "Yellow Cards", value: stats.cards.yellow },
                    { label: "Red Cards", value: stats.cards.red },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="bg-stadium-surface border border-stadium-border rounded-xl p-4"
                    >
                      <div className="font-bebas text-5xl text-white leading-none mb-1">
                        {value}
                      </div>
                      <div className="font-barlow text-stadium-muted text-xs uppercase tracking-wider">
                        {label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Additional stats */}
                {stats.shots.total !== null && (
                  <div className="bg-stadium-surface border border-stadium-border rounded-xl p-5">
                    <h3 className="font-barlow font-semibold text-white uppercase tracking-wider text-sm mb-4">
                      Detailed Stats
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm font-inter">
                      {[
                        ["Shots Total", stats.shots.total],
                        ["Shots on Target", stats.shots.on],
                        ["Pass Accuracy", stats.passes.accuracy ? `${stats.passes.accuracy}%` : "—"],
                        ["Tackles", stats.tackles.total],
                        ["Dribble Success", stats.dribbles.success !== null ? `${stats.dribbles.success}/${stats.dribbles.attempts}` : "—"],
                        ["Rating", stats.games.rating ?? "—"],
                      ].map(([label, value]) => (
                        <div key={String(label)} className="flex justify-between py-1.5 border-b border-stadium-border/50 last:border-0">
                          <span className="text-stadium-muted">{label}</span>
                          <span className="text-white font-medium">{value ?? "—"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-stadium-muted font-inter py-12 text-center">
                No stats available for this season.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
