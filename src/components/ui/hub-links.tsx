import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SubNavBar } from "@/components/ui/sub-nav-bar";
import { cn } from "@/lib/utils";

/* ── Shared Types & Route Maps ───────────────────────────────────── */

export type SubNavGroup = "match" | "club" | "editorial" | "heritage";

export type SubNavSlug =
  | "fixtures"
  | "standings"
  | "stats"
  | "season"
  | "predictions"
  | "squad"
  | "injuries"
  | "transfers"
  | "history"
  | "gallery"
  | "about"
  | "news"
  | "digest"
  | "analysis";

export type HubCardSlug =
  | SubNavSlug
  | "legal"
  | "profile";

export type ConnectedGridPreset =
  | "fromFixtures"
  | "fromStandings"
  | "fromStats"
  | "fromSeason"
  | "fromPredictions"
  | "fromFixtureDetail"
  | "fromSquad"
  | "fromPlayer"
  | "fromInjuries"
  | "fromTransfers"
  | "fromHistory"
  | "fromGallery"
  | "fromHome"
  | "fromNews"
  | "fromDigest"
  | "fromAnalysis"
  | "fromAbout"
  | "fromProfile";

const SUB_NAV_HREF: Record<HubCardSlug, string> = {
  fixtures: "/fixtures",
  standings: "/standings",
  stats: "/stats",
  season: "/season",
  predictions: "/predictions",
  squad: "/squad",
  injuries: "/injuries",
  transfers: "/transfers",
  history: "/history",
  gallery: "/gallery",
  about: "/about",
  news: "/news",
  digest: "/news/digest",
  analysis: "/analysis",
  legal: "/legal",
  profile: "/profile",
};

const SUB_NAV_GROUPS: Record<SubNavGroup, readonly SubNavSlug[]> = {
  match: ["fixtures", "standings", "stats", "predictions", "season"],
  editorial: ["news", "digest", "analysis"],
  club: ["squad", "injuries", "transfers"],
  heritage: ["history", "gallery", "about"],
};

const PRESET_CARDS: Record<
  ConnectedGridPreset,
  readonly { slug: HubCardSlug; accent?: "red" | "gold" }[]
> = {
  fromFixtures: [
    { slug: "analysis", accent: "gold" },
    { slug: "injuries", accent: "red" },
    { slug: "squad", accent: "red" },
    { slug: "digest", accent: "gold" },
  ],
  fromStandings: [
    { slug: "analysis", accent: "gold" },
    { slug: "squad", accent: "red" },
    { slug: "news", accent: "red" },
    { slug: "history", accent: "gold" },
  ],
  fromStats: [
    { slug: "squad", accent: "red" },
    { slug: "analysis", accent: "gold" },
    { slug: "injuries", accent: "red" },
    { slug: "history", accent: "gold" },
  ],
  fromSeason: [
    { slug: "history", accent: "red" },
    { slug: "squad", accent: "gold" },
    { slug: "analysis", accent: "gold" },
    { slug: "gallery", accent: "red" },
  ],
  fromPredictions: [
    { slug: "injuries", accent: "red" },
    { slug: "analysis", accent: "gold" },
    { slug: "squad", accent: "red" },
    { slug: "digest", accent: "gold" },
  ],
  fromFixtureDetail: [
    { slug: "analysis", accent: "gold" },
    { slug: "injuries", accent: "red" },
    { slug: "squad", accent: "red" },
    { slug: "news", accent: "gold" },
  ],
  fromSquad: [
    { slug: "stats", accent: "red" },
    { slug: "fixtures", accent: "gold" },
    { slug: "analysis", accent: "gold" },
    { slug: "history", accent: "red" },
  ],
  fromPlayer: [
    { slug: "stats", accent: "gold" },
    { slug: "fixtures", accent: "red" },
    { slug: "news", accent: "red" },
    { slug: "history", accent: "gold" },
  ],
  fromInjuries: [
    { slug: "fixtures", accent: "gold" },
    { slug: "predictions", accent: "red" },
    { slug: "news", accent: "gold" },
    { slug: "analysis", accent: "red" },
  ],
  fromTransfers: [
    { slug: "digest", accent: "gold" },
    { slug: "news", accent: "red" },
    { slug: "fixtures", accent: "gold" },
    { slug: "history", accent: "red" },
  ],
  fromHistory: [
    { slug: "squad", accent: "red" },
    { slug: "season", accent: "gold" },
    { slug: "stats", accent: "red" },
    { slug: "news", accent: "gold" },
  ],
  fromGallery: [
    { slug: "squad", accent: "red" },
    { slug: "fixtures", accent: "red" },
    { slug: "news", accent: "gold" },
    { slug: "analysis", accent: "gold" },
  ],
  fromHome: [
    { slug: "squad", accent: "red" },
    { slug: "injuries", accent: "red" },
    { slug: "transfers", accent: "gold" },
    { slug: "analysis", accent: "gold" },
  ],
  fromNews: [
    { slug: "fixtures", accent: "red" },
    { slug: "transfers", accent: "gold" },
    { slug: "injuries", accent: "red" },
    { slug: "standings", accent: "gold" },
  ],
  fromDigest: [
    { slug: "fixtures", accent: "red" },
    { slug: "standings", accent: "gold" },
    { slug: "transfers", accent: "gold" },
    { slug: "squad", accent: "red" },
  ],
  fromAnalysis: [
    { slug: "fixtures", accent: "red" },
    { slug: "standings", accent: "gold" },
    { slug: "stats", accent: "red" },
    { slug: "predictions", accent: "gold" },
  ],
  fromAbout: [
    { slug: "legal", accent: "gold" },
    { slug: "news", accent: "red" },
    { slug: "fixtures", accent: "red" },
    { slug: "squad", accent: "gold" },
  ],
  fromProfile: [
    { slug: "predictions", accent: "gold" },
    { slug: "squad", accent: "red" },
    { slug: "news", accent: "red" },
    { slug: "fixtures", accent: "gold" },
  ],
};

/* ── 1. SectionSubNav ────────────────────────────────────────────── */

export interface SectionSubNavProps {
  group: SubNavGroup;
  current: SubNavSlug;
  badges?: Partial<Record<string, string | number>>;
  className?: string;
}

/** Full-width sticky sub-navigation bar for Match, Club, Editorial, and Heritage hubs. */
export async function SectionSubNav({
  group,
  current,
  badges,
  className,
}: SectionSubNavProps) {
  const t = await getTranslations("Hub");
  const items = SUB_NAV_GROUPS[group].map((slug) => ({
    slug,
    href: SUB_NAV_HREF[slug],
    label: t(`nav.${slug}`),
    badge: badges?.[slug],
  }));

  return (
    <SubNavBar
      ariaLabel={t("subNavLabel")}
      items={items}
      current={current}
      className={className}
    />
  );
}

/* ── 2. DataPulseStrip ───────────────────────────────────────────── */

export interface DataPulseItem {
  label: string;
  value: string | number;
  sublabel?: string;
  href?: string;
  accent?: "red" | "gold" | "emerald" | "muted";
}

export interface DataPulseStripProps {
  eyebrow?: string;
  items: DataPulseItem[];
  className?: string;
}

const PULSE_ACCENT_STYLE: Record<NonNullable<DataPulseItem["accent"]>, string> = {
  red: "text-white",
  gold: "text-lfc-gold",
  emerald: "text-white",
  muted: "text-stadium-muted",
};

/** Restrained 1px hairline ledger strip for live season, squad, and editorial figures. */
export function DataPulseStrip({ eyebrow, items, className }: DataPulseStripProps) {
  if (items.length === 0) return null;

  const gridCols =
    items.length === 1
      ? "grid-cols-1"
      : items.length === 2
        ? "grid-cols-2"
        : items.length === 3
          ? "grid-cols-2 sm:grid-cols-3"
          : "grid-cols-2 lg:grid-cols-4";

  return (
    <section aria-label={eyebrow} className={cn("w-full", className)}>
      {eyebrow && (
        <p className="section-label text-stadium-muted mb-2">{eyebrow}</p>
      )}
      <div className={cn("grid gap-px border border-[var(--line)] bg-[var(--line)]", gridCols)}>
        {items.map((item, idx) => {
          const valueColor = PULSE_ACCENT_STYLE[item.accent ?? "red"];
          const cellClass = cn(
            "flex h-full flex-col justify-between bg-[var(--surface-2)] p-3 sm:p-4",
            item.href && "group transition-colors hover:bg-[var(--surface-3)]",
          );

          const body = (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="font-barlow text-xs font-semibold uppercase tracking-[0.12em] text-stadium-muted">
                  {item.label}
                </span>
                {item.href && (
                  <ArrowRight
                    className="size-3.5 shrink-0 text-stadium-muted transition-transform group-hover:translate-x-0.5 group-hover:text-white"
                    aria-hidden
                  />
                )}
              </div>
              <div
                className={cn(
                  "mt-1.5 font-bebas text-2xl sm:text-3xl leading-none tracking-wide tabular-nums",
                  valueColor,
                )}
              >
                {item.value}
              </div>
              {item.sublabel && (
                <p className="mt-1 text-xs leading-snug text-stadium-muted">
                  {item.sublabel}
                </p>
              )}
            </>
          );

          if (item.href) {
            return (
              <Link key={`${item.label}-${idx}`} href={item.href} className={cellClass}>
                {body}
              </Link>
            );
          }

          return (
            <div key={`${item.label}-${idx}`} className={cellClass}>
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── 3. ConnectedPagesGrid ───────────────────────────────────────── */

export interface ConnectedPageCard {
  title: string;
  description: string;
  href: string;
  badge?: string;
  meta?: string;
  accent?: "red" | "gold";
}

export interface ConnectedPagesGridProps {
  eyebrow?: string;
  heading?: string;
  cards: ConnectedPageCard[];
  className?: string;
}

/** Restrained hairline editorial directory connecting related Liverpool pages. */
export function ConnectedPagesGrid({
  eyebrow,
  heading,
  cards,
  className,
}: ConnectedPagesGridProps) {
  if (cards.length === 0) return null;

  return (
    <section aria-label={heading ?? eyebrow} className={cn("w-full border-t border-[var(--line)] pt-6 sm:pt-8", className)}>
      {(eyebrow || heading) && (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          {heading && (
            <h2 className="font-barlow text-sm font-semibold uppercase tracking-[0.14em] text-white">
              {heading}
            </h2>
          )}
          {eyebrow && (
            <span className="font-barlow text-xs font-semibold uppercase tracking-[0.14em] text-stadium-muted">
              {eyebrow}
            </span>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 gap-px border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group flex h-full flex-col justify-between bg-stadium-bg p-3.5 transition-colors hover:bg-[var(--surface-1)] sm:p-4"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-barlow text-sm font-bold uppercase tracking-[0.08em] text-white transition-colors group-hover:text-lfc-gold">
                  {card.title}
                </h3>
                <ArrowRight
                  className="size-3.5 shrink-0 text-stadium-muted transition-transform group-hover:translate-x-0.5 group-hover:text-white"
                  aria-hidden
                />
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-stadium-muted line-clamp-2">
                {card.description}
              </p>
            </div>
            {card.meta && (
              <p className="mt-2.5 font-barlow text-xs font-semibold uppercase tracking-[0.08em] text-lfc-gold/90 tabular-nums">
                {card.meta}
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ── 4. PresetConnectedGrid ──────────────────────────────────────── */

export interface PresetConnectedGridProps {
  preset: ConnectedGridPreset;
  metaOverrides?: Partial<Record<string, string>>;
  className?: string;
}

/** Curated, localized 4-card cross-navigation grid tailored to each Anfield Daily page. */
export async function PresetConnectedGrid({
  preset,
  metaOverrides,
  className,
}: PresetConnectedGridProps) {
  const t = await getTranslations("Hub");
  const entries = PRESET_CARDS[preset];

  const cards: ConnectedPageCard[] = entries.map(({ slug, accent }) => {
    const href = SUB_NAV_HREF[slug];
    return {
      title: t(`cards.${slug}.title`),
      description: t(`cards.${slug}.desc`),
      badge: t(`cards.${slug}.badge`),
      href,
      meta: metaOverrides?.[slug] ?? metaOverrides?.[href],
      accent,
    };
  });

  return (
    <ConnectedPagesGrid
      eyebrow={t("eyebrow")}
      heading={t("connectedHeading")}
      cards={cards}
      className={className}
    />
  );
}
