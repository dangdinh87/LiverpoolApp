import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSquadPlayers } from "@/lib/squad-data";
import { SquadGrid } from "@/components/squad/squad-grid";
import { makePageMeta } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Squad.metadata");
  const title = t("title");
  const description = t("description");
  return { title, description, ...makePageMeta(title, description, { path: "/squad" }) };
}

export default async function SquadPage() {
  const t = await getTranslations("Squad");

  const squadPlayers = getSquadPlayers({ includeLoans: true, includeForever: true });

  return (
    <div className="min-h-screen">
      {/* Hero — compact */}
      <div className="relative h-[25vh] min-h-[200px] flex items-end overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/assets/lfc/stadium/anfield-pitch.webp')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stadium-bg via-stadium-bg/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-stadium-bg/50 via-transparent to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 w-full">
          <p className="font-barlow text-lfc-red uppercase tracking-[0.3em] text-[10px] font-bold mb-1">
            {t("season", { season: "2025/26" })}
          </p>
          <div className="flex items-baseline gap-4">
            <h1 className="font-bebas text-5xl md:text-6xl text-white tracking-widest leading-none">
              {t("title")}
            </h1>
            <span className="font-bebas text-lg text-stadium-muted tracking-wider">
              {t("count", { count: squadPlayers.length, n: squadPlayers.length })}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
        <SquadGrid players={squadPlayers} />
      </div>
    </div>
  );
}
