import type { Metadata } from "next";
import Image from "next/image";
import trophiesEn from "@/data/trophies.json";
import trophiesVi from "@/data/trophies.vi.json";
import historyEventsEn from "@/data/history.json";
import historyEventsVi from "@/data/history.vi.json";
import legendsEn from "@/data/legends.json";
import legendsVi from "@/data/legends.vi.json";
import clubInfoEn from "@/data/club-info.json";
import clubInfoVi from "@/data/club-info.vi.json";
import { TrophyCabinet } from "@/components/history/trophy-cabinet";
import { ClubTimeline } from "@/components/history/club-timeline";
import { LegendCard } from "@/components/history/legend-card";
import { ClubTabs } from "@/components/history/club-tabs";
import { ManagerAvatar } from "@/components/history/manager-avatar";
import { StadiumShowcase } from "@/components/history/stadium-showcase";
import { Shield, Target, Trophy, Star, History as HistoryIcon, Users, MapPin, Music, ExternalLink, Camera } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { makePageMeta } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("History.metadata");
  const title = t("title");
  const description = t("description");
  return { title, description, ...makePageMeta(title, description) };
}

export const dynamic = "force-dynamic";

function SectionHeader({ label, title, icon: Icon }: { label: string; title: string, icon?: React.ElementType }) {
  return (
    <div className="mb-12 flex items-end justify-between border-b border-stadium-border/50 pb-5">
      <div>
        <p className="font-barlow text-lfc-red uppercase tracking-[0.2em] text-[10px] font-bold mb-1">
          {label}
        </p>
        <h2 className="font-bebas text-4xl md:text-5xl text-white tracking-wider leading-none">
          {title}
        </h2>
      </div>
      {Icon && <Icon className="text-white/5 w-12 h-12 mb-[-8px]" />}
    </div>
  );
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const t = await getTranslations("History");
  const locale = await getLocale();
  const isVi = locale === "vi";

  const trophies = isVi ? trophiesVi : trophiesEn;
  const historyEvents = isVi ? historyEventsVi : historyEventsEn;
  const legends = isVi ? legendsVi : legendsEn;
  const clubInfo = isVi ? clubInfoVi : clubInfoEn;

  /* ── Tab 1: Overview ── */
  const overviewPanel = (
    <div className="space-y-24">
      {/* Key Facts */}
      <section>
        <SectionHeader label={t("sections.profile")} title={t("sections.facts")} icon={Shield} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-stadium-border/30 border border-stadium-border/30 overflow-hidden">
          {(
            [
              [t("facts.fullName"), clubInfo.fullName],
              [t("facts.founded"), clubInfo.founded],
              [t("facts.founder"), clubInfo.founder],
              [t("facts.nickname"), clubInfo.nickname.join(", ")],
              [t("facts.captain"), clubInfo.captain],
              [t("facts.manager"), clubInfo.manager],
              [t("facts.owner"), clubInfo.owner],
              [t("facts.chairman"), clubInfo.chairman],
              [t("facts.league"), clubInfo.league],
              [t("facts.kitManufacturer"), clubInfo.kitManufacturer],
              [t("facts.website"), clubInfo.website],
            ] as [string, string][]
          ).map(([label, value]) => (
            <div
              key={label}
              className="bg-stadium-bg p-6 hover:bg-stadium-surface/30 transition-colors"
            >
              <p className="font-barlow text-[9px] text-stadium-muted uppercase tracking-[0.2em] mb-2 font-bold">
                {label}
              </p>
              <p className="font-inter text-white text-sm font-semibold tracking-wide">
                {value}
              </p>
            </div>
          ))}
          {/* Colours cell with visual swatches */}
          <div className="bg-stadium-bg p-6 hover:bg-stadium-surface/30 transition-colors">
            <p className="font-barlow text-[9px] text-stadium-muted uppercase tracking-[0.2em] mb-2 font-bold">
              {t("facts.colours")}
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded-full border border-white/20 shadow-lg shadow-[#C8102E]/30"
                  style={{ backgroundColor: clubInfo.colours.homeHex }}
                />
                <span className="font-inter text-white text-sm font-semibold">{clubInfo.colours.home}</span>
              </div>
              <span className="text-stadium-muted text-xs">/</span>
              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded-full border border-white/20"
                  style={{ backgroundColor: clubInfo.colours.awayHex }}
                />
                <span className="font-inter text-white text-sm font-semibold">{t("facts.white")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Traditions */}
      <section>
        <SectionHeader label={t("sections.culture")} title={t("sections.traditions")} icon={Target} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {clubInfo.traditions.map((tradition: { name: string; description: string; songUrl?: string }) => (
            <div
              key={tradition.name}
              className="group bg-stadium-surface border border-stadium-border p-8 hover:border-lfc-red/30 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bebas text-2xl text-white tracking-wider group-hover:text-lfc-red transition-colors">
                  {tradition.name}
                </h3>
                {tradition.songUrl && (
                  <a
                    href={tradition.songUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-lfc-red/10 border border-lfc-red/20 text-lfc-red text-[10px] font-barlow font-bold uppercase tracking-widest hover:bg-lfc-red/20 transition-colors"
                  >
                    <Music size={12} />
                    {t("tradition.listen")}
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
              <p className="font-inter text-stadium-muted text-sm leading-relaxed border-l-2 border-lfc-red/20 pl-4 py-1">
                {tradition.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Records */}
      <section>
        <SectionHeader label={t("sections.allTime")} title={t("sections.records")} icon={Star} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {(
            [
              [
                t("records.topScorer"),
                clubInfo.records.topScorer.name,
                t("records.goalsCount", { count: clubInfo.records.topScorer.goals }),
              ],
              [
                t("records.appearances"),
                clubInfo.records.mostAppearances.name,
                t("records.appsCount", { count: clubInfo.records.mostAppearances.appearances }),
              ],
              [
                t("records.signing"),
                clubInfo.records.recordTransferIn.name,
                `${clubInfo.records.recordTransferIn.fee}`,
              ],
              [
                t("records.sale"),
                clubInfo.records.recordTransferOut.name,
                `${clubInfo.records.recordTransferOut.fee}`,
              ],
            ] as const
          ).map(([label, name, detail]) => (
            <div
              key={label}
              className="relative bg-stadium-surface border border-stadium-border p-6 flex flex-col justify-between overflow-hidden group hover:border-lfc-gold/50 transition-colors"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-lfc-gold/5 blur-3xl -mr-12 -mt-12 group-hover:bg-lfc-gold/20 transition-colors" />
              <div>
                <p className="font-barlow text-[9px] text-stadium-muted uppercase tracking-[0.22em] mb-4 font-bold">
                  {label}
                </p>
                <p className="font-bebas text-2xl text-white tracking-wider mb-1">
                  {name}
                </p>
              </div>
              <p className="font-inter text-lfc-gold text-xs font-bold uppercase tracking-widest">{detail}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  /* ── Tab 2: Anfield ── */
  const anfieldPanel = (
    <div className="relative space-y-20">
      {/* Fixed background */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <Image
          src="/assets/lfc/stadium/anfield-aerial.webp"
          alt=""
          fill
          className="object-cover opacity-[0.06]"
          sizes="100vw"
          unoptimized
        />
      </div>

      {/* Stadium hero card */}
      <section>
        <div className="bg-stadium-surface border border-stadium-border overflow-hidden group">
          <div className="relative h-72 sm:h-[400px] overflow-hidden">
            <Image
              src="/assets/lfc/stadium/anfield-interior.webp"
              alt="Anfield Stadium"
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 1200px"
              unoptimized
            />
            <div className="absolute inset-0 bg-linear-to-t from-stadium-bg via-stadium-bg/60 to-transparent" />
            <div className="absolute bottom-10 left-10 right-10">
              <p className="font-barlow text-lfc-red uppercase tracking-[0.25em] text-xs font-bold mb-2">{t("stadium.fortress")}</p>
              <h3 className="font-bebas text-6xl text-white tracking-wider leading-none">
                {clubInfo.stadium.name}
              </h3>
              <p className="font-inter text-stadium-muted text-sm mt-2 opacity-80">
                {clubInfo.stadium.address}
              </p>
            </div>
          </div>
          <div className="p-10 bg-stadium-bg/50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {(
                [
                  [t("stadium.capacity"), clubInfo.stadium.capacity.toLocaleString()],
                  [t("stadium.opened"), String(clubInfo.stadium.opened)],
                  [t("stadium.pitch"), clubInfo.stadium.pitch],
                  [t("stadium.record"), "61,905 (1952)"],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="border-l border-stadium-border/50 pl-6">
                  <p className="font-barlow text-[9px] text-stadium-muted uppercase tracking-[0.2em] mb-2 font-bold">
                    {label}
                  </p>
                  <p className="font-bebas text-3xl text-white leading-none">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stands */}
      <section>
        <SectionHeader label={t("sections.layout")} title={t("sections.stands")} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-stadium-border/30 border border-stadium-border/30 overflow-hidden">
          {clubInfo.stadium.stands.map((stand) => (
            <div
              key={stand.name}
              className="bg-stadium-bg p-8 hover:bg-stadium-surface/30 transition-colors"
            >
              <div className="flex items-baseline justify-between mb-4">
                <h4 className="font-bebas text-2xl text-white tracking-wider group-hover:text-lfc-red">
                  {stand.name}
                </h4>
                <div className="flex flex-col items-end">
                  <span className="font-bebas text-lfc-gold text-xl leading-none">
                    {stand.capacity.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-stadium-muted font-bold uppercase tracking-widest">{t("stadium.seats")}</span>
                </div>
              </div>
              <p className="font-inter text-stadium-muted text-sm leading-relaxed max-w-sm">
                {stand.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Landmarks */}
      <section>
        <SectionHeader label={t("sections.iconic")} title={t("sections.anfield")} icon={MapPin} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {clubInfo.stadium.landmarks.map((landmark) => (
            <div
              key={landmark.name}
              className="bg-stadium-surface/30 border border-stadium-border p-6 hover:shadow-lg transition-all border-b-2 hover:border-b-lfc-red"
            >
              <h4 className="font-bebas text-xl text-white tracking-wider mb-3">
                {landmark.name}
              </h4>
              <p className="font-inter text-stadium-muted text-xs leading-relaxed opacity-80">
                {landmark.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Stadium images */}
      <section>
        <SectionHeader label={t("sections.gallery")} title={t("sections.stadiumImages")} icon={Camera} />
        <StadiumShowcase />
      </section>

    </div>
  );

  /* ── Tab 3: Honours ── */
  const honoursPanel = (
    <div className="space-y-16">
      <section>
        <SectionHeader label={t("sections.glory")} title={t("sections.cabinet")} icon={Trophy} />
        <TrophyCabinet trophies={trophies} />
      </section>
    </div>
  );

  /* ── Tab 4: Timeline ── */
  const timelinePanel = (
    <div className="pb-10">
      <SectionHeader label={t("sections.history")} title={t("sections.timeline")} icon={HistoryIcon} />
      <div className="mt-12">
        <ClubTimeline events={historyEvents} />
      </div>
    </div>
  );

  /* ── Tab 5: Legends ── */
  const legendsPanel = (
    <div className="space-y-24">
      {/* Managers */}
      <section>
        <SectionHeader label={t("sections.masterminds")} title={t("sections.managers")} icon={Users} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {clubInfo.managers.map((mgr) => (
            <div
              key={mgr.name}
              className="bg-stadium-surface border border-stadium-border p-5 hover:border-lfc-red/30 transition-all group flex items-center gap-5"
            >
              {/* Avatar */}
              <div className="relative w-14 h-14 shrink-0 overflow-hidden rounded-sm bg-stadium-surface2">
                <ManagerAvatar
                  name={mgr.name}
                  image={"image" in mgr ? (mgr.image as string | undefined) : undefined}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bebas text-2xl text-white tracking-wider leading-none mb-0.5">
                  {mgr.name}
                </p>
                <p className="font-barlow text-lfc-red text-[10px] font-bold uppercase tracking-widest mb-1.5">
                  {mgr.years}
                </p>
                <p className="font-inter text-stadium-muted text-xs leading-relaxed opacity-70 truncate">
                  {mgr.trophies}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Legends */}
      <section>
        <SectionHeader label={t("sections.immortals")} title={t("sections.legends")} icon={Users} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {legends.map((legend) => (
            <LegendCard key={legend.name} legend={legend} />
          ))}
        </div>
      </section>
    </div>
  );

  return (
    <div className="min-h-screen bg-stadium-bg text-white">
      {/* ── Hero ── */}
      <div className="relative h-[380px] md:h-[420px] pt-28 flex items-end overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center animate-[subtleZoom_20s_infinite_alternate]"
          style={{
            backgroundImage:
              "url('/assets/lfc/stadium/anfield-aerial.webp')",
          }}
        />
        <div className="absolute inset-0 bg-linear-to-t from-stadium-bg via-stadium-bg/80 to-transparent" />
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 w-full">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-px bg-lfc-red" />
            <p className="font-barlow text-lfc-red uppercase tracking-[0.3em] text-xs font-bold">
              {t("hero.est")}
            </p>
          </div>
          <h1 className="font-bebas text-5xl md:text-7xl text-white tracking-widest leading-none mb-4 drop-shadow-2xl">
            Liverpool FC
          </h1>
          <p className="font-inter text-stadium-muted text-sm max-w-xl leading-relaxed opacity-90 font-medium">
            {t("hero.foundingStory")}
          </p>
        </div>
      </div>

      {/* ── Tabbed content ── */}
      <ClubTabs
        overviewPanel={overviewPanel}
        anfieldPanel={anfieldPanel}
        honoursPanel={honoursPanel}
        timelinePanel={timelinePanel}
        legendsPanel={legendsPanel}
        defaultTab={tab}
        tabLabels={{
          overview: t("tabs.overview"),
          anfield: t("tabs.anfield"),
          honours: t("tabs.honours"),
          timeline: t("tabs.timeline"),
          legends: t("tabs.legends"),
        }}
      />
    </div>
  );
}
