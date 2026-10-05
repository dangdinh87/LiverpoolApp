import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";
import { ExternalLink, Music } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { LocaleParams } from "@/i18n/routing";
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
import { HistoryNav } from "@/components/history/history-nav";
import { ManagerAvatar } from "@/components/history/manager-avatar";
import { StadiumShowcase } from "@/components/history/stadium-showcase";
import { PageHero } from "@/components/ui/page-hero";
import { SectionHeader } from "@/components/ui/section-header";
import { makePageMeta, buildBreadcrumbJsonLd, getCanonical } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "History.metadata" });
  const title = t("title");
  const description = t("description");
  return { title, description, ...makePageMeta(title, description, { path: "/history" }) };
}

export const revalidate = 86400; // 24 hours — static data from JSON

/** Anchor target that clears the fixed header and the sticky section nav. */
function Section({ id, children, deferred }: { id: string; children: ReactNode; deferred?: boolean }) {
  return (
    <section
      id={id}
      className={`scroll-mt-[calc(var(--header-h)+3.5rem)] py-10 sm:py-14 ${deferred ? "defer-render" : ""}`}
    >
      {children}
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0">
      <dd className="font-bebas text-3xl leading-none text-white sm:text-4xl">{value}</dd>
      <dt className="mt-1 font-barlow text-xs font-semibold uppercase leading-tight tracking-[0.1em] text-stadium-muted">{label}</dt>
    </div>
  );
}

export default async function HistoryPage({
  params,
  searchParams,
}: LocaleParams & {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await searchParams;
  const t = await getTranslations("History");
  const isVi = locale === "vi";

  const trophies = isVi ? trophiesVi : trophiesEn;
  const historyEvents = isVi ? historyEventsVi : historyEventsEn;
  const legends = isVi ? legendsVi : legendsEn;
  const clubInfo = isVi ? clubInfoVi : clubInfoEn;

  const founded = clubInfo.founded.match(/\d{4}/)?.[0] ?? "1892";
  const league = trophies[0];
  const europe = trophies[1];
  const numberFmt = new Intl.NumberFormat(isVi ? "vi-VN" : "en-GB");
  const [recordNumber, ...recordRest] = String(clubInfo.stadium.recordAttendance).split(" ");

  const navItems = [
    { id: "timeline", label: t("nav.timeline") },
    { id: "trophies", label: t("nav.trophies") },
    { id: "legends", label: t("nav.legends") },
    { id: "stadium", label: t("nav.stadium") },
  ];

  const facts: [string, string][] = [
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
  ];

  const records: [string, string, string][] = [
    [t("records.topScorer"), clubInfo.records.topScorer.name, t("records.goalsCount", { count: clubInfo.records.topScorer.goals })],
    [t("records.appearances"), clubInfo.records.mostAppearances.name, t("records.appsCount", { count: clubInfo.records.mostAppearances.appearances })],
    [t("records.signing"), clubInfo.records.recordTransferIn.name, `${clubInfo.records.recordTransferIn.fee}`],
    [t("records.sale"), clubInfo.records.recordTransferOut.name, `${clubInfo.records.recordTransferOut.fee}`],
  ];

  return (
    <div className="bg-stadium-bg text-white">
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Home", url: getCanonical("/") },
          { name: "History", url: getCanonical("/history") },
        ])}
      />

      <PageHero
        eyebrow={t("hero.est")}
        title="Liverpool FC"
        description={t("hero.tagline")}
        image="/assets/lfc/stadium/anfield-champions-league.webp"
        actions={
          <dl className="grid grid-cols-4 gap-4 sm:gap-8">
            <Stat value={founded} label={t("facts.founded")} />
            <Stat value={String(league.count)} label={league.name} />
            <Stat value={String(europe.count)} label={europe.name} />
            <Stat value={numberFmt.format(clubInfo.stadium.capacity)} label={t("stadium.capacity")} />
          </dl>
        }
      />

      <HistoryNav items={navItems} ariaLabel={t("nav.label")} />

      <div className="page-container">
        {/* ── Timeline ── */}
        <Section id="timeline">
          <SectionHeader eyebrow={t("sections.history")} title={t("sections.timeline")} />
          <p className="mb-8 hidden max-w-[65ch] text-[15px] leading-relaxed text-stadium-muted sm:block sm:text-base">
            {t("hero.foundingStory")}
          </p>
          <ClubTimeline events={historyEvents} />
        </Section>

        {/* ── Trophies + records ── */}
        <Section id="trophies">
          <SectionHeader eyebrow={t("sections.glory")} title={t("sections.cabinet")} />
          <TrophyCabinet trophies={trophies} />

          <SectionHeader className="mt-12" eyebrow={t("sections.allTime")} title={t("sections.records")} />
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {records.map(([label, name, detail]) => (
              <li key={label} className="surface flex flex-col gap-1 p-4 sm:p-5">
                <p className="font-barlow text-xs font-bold uppercase tracking-[0.16em] text-stadium-muted">{label}</p>
                <p className="font-bebas text-2xl leading-tight text-white">{name}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-lfc-gold">{detail}</p>
              </li>
            ))}
          </ul>
        </Section>

        {/* ── Managers + legends ── */}
        <Section id="legends" deferred>
          <SectionHeader eyebrow={t("sections.masterminds")} title={t("sections.managers")} />
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {clubInfo.managers.map((mgr) => (
              <li key={mgr.name} className="surface flex min-h-[4.5rem] items-center gap-4 p-3 sm:p-4">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-full bg-[var(--surface-3)]">
                  <ManagerAvatar name={mgr.name} image={"image" in mgr ? (mgr.image as string | undefined) : undefined} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bebas text-2xl leading-none text-white">{mgr.name}</h3>
                  <p className="mt-1 font-barlow text-xs font-bold uppercase tracking-widest text-brand">{mgr.years}</p>
                  <p className="mt-1 text-xs text-stadium-muted">{mgr.trophies}</p>
                </div>
              </li>
            ))}
          </ul>

          <SectionHeader className="mt-12" eyebrow={t("sections.immortals")} title={t("sections.legends")} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {legends.map((legend) => (
              <LegendCard key={legend.name} legend={legend} />
            ))}
          </div>
        </Section>

        {/* ── Stadium ── */}
        <Section id="stadium" deferred>
          <SectionHeader eyebrow={t("stadium.fortress")} title={clubInfo.stadium.name} />
          <div className="surface overflow-hidden">
            <div className="relative aspect-[16/9] sm:aspect-[21/9]">
              <Image
                src="/assets/lfc/stadium/anfield-interior.webp"
                alt={clubInfo.stadium.name}
                fill
                sizes="(max-width: 1152px) 100vw, 1152px"
                className="object-cover"
              />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[var(--surface-2)] via-transparent to-transparent" />
            </div>
            <div className="p-4 sm:p-6">
              <p className="mb-4 text-sm text-stadium-muted">{clubInfo.stadium.address}</p>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
                <Stat value={numberFmt.format(clubInfo.stadium.capacity)} label={t("stadium.capacity")} />
                <Stat value={String(clubInfo.stadium.opened)} label={t("stadium.opened")} />
                <Stat value={clubInfo.stadium.pitch} label={t("stadium.pitch")} />
                <Stat value={numberFmt.format(Number(recordNumber.replace(/[.,]/g, "")))} label={t("stadium.record")} />
              </dl>
              {recordRest.length > 0 && (
                <p className="mt-3 text-xs text-stadium-muted">
                  {t("stadium.record")}: {recordNumber} {recordRest.join(" ")}
                </p>
              )}
            </div>
          </div>

          <SectionHeader className="mt-12" eyebrow={t("sections.layout")} title={t("sections.stands")} />
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {clubInfo.stadium.stands.map((stand) => (
              <li key={stand.name} className="surface p-4 sm:p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-bebas text-2xl text-white">{stand.name}</h3>
                  <p className="shrink-0 text-right">
                    <span className="font-bebas text-xl leading-none text-lfc-gold">{numberFmt.format(stand.capacity)}</span>{" "}
                    <span className="font-barlow text-xs font-bold uppercase tracking-widest text-stadium-muted">{t("stadium.seats")}</span>
                  </p>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-stadium-muted">{stand.description}</p>
              </li>
            ))}
          </ul>

          <SectionHeader className="mt-12" eyebrow={t("sections.gallery")} title={t("sections.stadiumImages")} />
          <StadiumShowcase label={t("sections.stadiumImages")} />

          <SectionHeader className="mt-12" eyebrow={t("sections.iconic")} title={t("sections.anfield")} />
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {clubInfo.stadium.landmarks.map((landmark) => (
              <li key={landmark.name} className="surface border-b-2 border-b-lfc-red/60 p-4 sm:p-5">
                <h3 className="font-bebas text-xl text-white">{landmark.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stadium-muted">{landmark.description}</p>
              </li>
            ))}
          </ul>

          <SectionHeader className="mt-12" eyebrow={t("sections.culture")} title={t("sections.traditions")} />
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {clubInfo.traditions.map((tradition: { name: string; description: string; songUrl?: string }) => (
              <li key={tradition.name} className="surface flex flex-col gap-3 p-4 sm:p-5">
                <h3 className="font-bebas text-2xl text-white">{tradition.name}</h3>
                <p className="border-l-2 border-lfc-red/40 pl-4 text-sm leading-relaxed text-stadium-muted">{tradition.description}</p>
                {tradition.songUrl && (
                  <a
                    href={tradition.songUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 self-start border border-[var(--line-strong)] px-4 font-barlow text-xs font-bold uppercase tracking-widest text-white transition-colors hover:border-lfc-red hover:bg-lfc-red/10"
                  >
                    <Music size={14} aria-hidden />
                    {t("tradition.listen")}
                    <ExternalLink size={12} aria-hidden />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </Section>

        {/* ── Club profile ── */}
        <Section id="profile">
          <SectionHeader eyebrow={t("sections.profile")} title={t("sections.facts")} />
          <dl className="grid grid-cols-1 gap-px border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-4">
            {facts.map(([label, value]) => (
              <div key={label} className="bg-stadium-bg p-4">
                <dt className="font-barlow text-xs font-bold uppercase tracking-[0.16em] text-stadium-muted">{label}</dt>
                <dd className="mt-1.5 text-sm font-semibold text-white">{value}</dd>
              </div>
            ))}
            <div className="bg-stadium-bg p-4">
              <dt className="font-barlow text-xs font-bold uppercase tracking-[0.16em] text-stadium-muted">{t("facts.colours")}</dt>
              <dd className="mt-1.5 flex items-center gap-3 text-sm font-semibold text-white">
                <span className="flex items-center gap-2">
                  <span aria-hidden className="size-4 rounded-full border border-white/20" style={{ backgroundColor: clubInfo.colours.homeHex }} />
                  {clubInfo.colours.home}
                </span>
                <span aria-hidden className="text-stadium-muted">/</span>
                <span className="flex items-center gap-2">
                  <span aria-hidden className="size-4 rounded-full border border-white/20" style={{ backgroundColor: clubInfo.colours.awayHex }} />
                  {t("facts.white")}
                </span>
              </dd>
            </div>
          </dl>
        </Section>
      </div>
      <div className="pb-16" />
    </div>
  );
}
