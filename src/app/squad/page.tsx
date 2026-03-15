import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSquadPlayers } from "@/lib/squad-data";
import { SquadGrid } from "@/components/squad/squad-grid";
import { makePageMeta } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Squad.metadata");
  const title = t("title");
  const description = t("description");
  return { title, description, ...makePageMeta(title, description) };
}

export default async function SquadPage() {
  const t = await getTranslations("Squad");

  const squadPlayers = getSquadPlayers({ includeLoans: true, includeForever: true });

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative h-[35vh] min-h-[280px] flex items-end overflow-hidden">
        {/* Background with subtle zoom */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 animate-[subtleZoom_25s_infinite_alternate]"
          style={{
            backgroundImage: "url('/assets/lfc/stadium/anfield-pitch.webp')",
          }}
        />
        {/* Layered overlays for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-stadium-bg via-stadium-bg/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-stadium-bg/50 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-black/15" />

        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 w-full">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-[1px] bg-lfc-red" />
            <p className="font-barlow text-lfc-red uppercase tracking-[0.3em] text-xs font-bold">
              {t("season", { season: "2025/26" })}
            </p>
          </div>
          <h1 className="font-bebas text-7xl md:text-9xl text-white tracking-widest leading-none mb-4 drop-shadow-2xl">
            {t("title")}
          </h1>
          <div className="flex items-center gap-4">
            <div className="px-4 py-1.5 bg-lfc-red/10 border border-lfc-red/20">
              <span className="font-bebas text-xl text-lfc-red tracking-wider">
                {t("count", { count: squadPlayers.length, n: squadPlayers.length })}
              </span>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <p className="font-inter text-stadium-muted text-sm opacity-80">
              {t("club")}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
        <SquadGrid players={squadPlayers} />
      </div>
    </div>
  );
}
