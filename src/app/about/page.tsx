import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Heart, Database, Newspaper, Globe, Coffee } from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description:
    "About this fan-made Liverpool FC website — built with passion, powered by the Kop.",
};

/* ── Data ────────────────────────────────────────────────────────── */

const HONOURS = [
  { label: "League Titles", count: 20, icon: "/assets/lfc/trophies/league-title.svg" },
  { label: "European Cups", count: 6, icon: "/assets/lfc/trophies/european-cup.svg" },
  { label: "FA Cups", count: 8, icon: "/assets/lfc/trophies/fa-cup.svg" },
  { label: "UEFA Cups", count: 3, icon: "/assets/lfc/trophies/uefa-cup.svg" },
  { label: "League Cups", count: 10, icon: "/assets/lfc/trophies/league-cup.svg" },
  { label: "UEFA Super Cups", count: 4, icon: "/assets/lfc/trophies/uefa-super-cup.svg" },
  { label: "FIFA Club World Cup", count: 1, icon: "/assets/lfc/trophies/fifa-club-world-cup.svg" },
] as const;

const PARTNERS = [
  { name: "Standard Chartered", role: "Principal Partner" },
  { name: "Nike", role: "Kit Supplier" },
  { name: "AXA", role: "Training Kit Partner" },
  { name: "Expedia", role: "Official Partner" },
  { name: "Google Pixel", role: "Official Partner" },
] as const;

const DATA_SOURCES = [
  {
    Icon: Database,
    name: "Fantasy Premier League",
    description: "Live match data, fixtures, player statistics and squad information.",
    url: "https://fantasy.premierleague.com",
  },
  {
    Icon: Newspaper,
    name: "BBC Sport RSS",
    description: "Latest Liverpool FC news articles aggregated from BBC Sport feeds.",
    url: "https://www.bbc.co.uk/sport/football",
  },
  {
    Icon: Globe,
    name: "liverpoolfc.com",
    description: "Official club assets, trophy data, memorial graphics and reference information.",
    url: "https://www.liverpoolfc.com",
  },
] as const;

const FEATURES = [
  "Full squad browser with player detail pages",
  "Fixtures timeline with competition filters",
  "Live Premier League standings",
  "Season statistics with interactive charts",
  "Club history, legends, trophy cabinet & timeline",
  "Anfield stadium info with stands & landmarks",
  "BBC Sport news feed integration",
  "User accounts with favourite players",
  "Avatar upload & profile customisation",
  "Dark & light theme support",
  "Responsive design — mobile to desktop",
  "SEO optimised with Open Graph metadata",
] as const;

/* ── Page ─────────────────────────────────────────────────────────── */

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative h-[40vh] min-h-[320px] flex items-end">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/lfc/stadium/anfield-aerial.webp')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stadium-bg via-stadium-bg/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-stadium-bg/80 to-transparent" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 w-full">
          <Image
            src="/assets/lfc/crest.webp"
            alt="Liverpool FC"
            width={56}
            height={70}
            className="mb-4"
          />
          <h1 className="font-bebas text-7xl md:text-8xl text-white tracking-wider leading-none mb-3">
            About This Site
          </h1>
          <p className="font-inter text-stadium-muted max-w-xl leading-relaxed">
            A fan-made Liverpool FC website — bringing you live results, squad info,
            fixtures, standings, stats and history all in one place.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">

        {/* ── Honours ───────────────────────────────────────────── */}
        <section className="mb-16">
          <h2 className="font-bebas text-3xl text-white tracking-wider mb-6">
            Honours
          </h2>
          <div className="bg-stadium-surface border border-stadium-border rounded-none p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-6 sm:gap-x-8 md:gap-x-10">
              {HONOURS.map(({ label, count, icon }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-1.5 min-w-[70px]"
                >
                  <Image
                    src={icon}
                    alt={label}
                    width={32}
                    height={34}
                    className="h-8 w-auto"
                  />
                  <span className="font-bebas text-2xl text-white leading-none">
                    {count}
                  </span>
                  <span className="font-barlow text-[10px] text-stadium-muted uppercase tracking-wider text-center leading-tight">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Partners ─────────────────────────────────────────── */}
        <section className="mb-16">
          <h2 className="font-bebas text-3xl text-white tracking-wider mb-6">
            Partners
          </h2>
          <div className="bg-stadium-surface border border-stadium-border rounded-none p-6">
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              {PARTNERS.map(({ name, role }) => (
                <div
                  key={name}
                  className="flex flex-col items-center"
                >
                  <span className="font-barlow text-sm text-white font-semibold tracking-wide">
                    {name}
                  </span>
                  <span className="font-inter text-[9px] text-stadium-muted uppercase tracking-widest">
                    {role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Disclaimer ─────────────────────────────────────────── */}
        <div className="bg-lfc-red/10 border border-lfc-red/20 rounded-none p-6 mb-16">
          <div className="flex items-start gap-3">
            <Heart size={20} className="text-lfc-red shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bebas text-xl text-white tracking-wider mb-2">
                Fan-Made & Unofficial
              </h2>
              <p className="font-inter text-stadium-muted text-sm leading-relaxed">
                This website is created by a fan, for fans. It is not an official Liverpool FC product
                and is not endorsed by, affiliated with, or connected to Liverpool Football Club,
                Fenway Sports Group, or the Premier League. All Liverpool FC trademarks, logos, and
                brand elements are the property of their respective owners.
              </p>
            </div>
          </div>
        </div>

        {/* ── What Is This Site ───────────────────────────────────── */}
        <section className="mb-16">
          <h2 className="font-bebas text-3xl text-white tracking-wider mb-6">
            What Is This Site?
          </h2>
          <div className="bg-stadium-surface border border-stadium-border rounded-none p-6 space-y-4">
            <p className="font-inter text-stadium-muted text-sm leading-relaxed">
              This is a comprehensive Liverpool FC fan site that gathers data from multiple
              sources to give you everything you need as a Red — from live match data and
              Premier League standings to detailed squad profiles and club history.
            </p>
            <p className="font-inter text-stadium-muted text-sm leading-relaxed">
              The site pulls real-time data from the Fantasy Premier League API for match results, fixtures,
              and player statistics. League standings are provided by Football-Data.org. News is aggregated from BBC Sport RSS
              feeds. Club assets and historical data come from the official Liverpool FC website
              and publicly available records.
            </p>
            <p className="font-inter text-stadium-muted text-sm leading-relaxed">
              Whether you&apos;re checking the score on matchday, researching a player&apos;s stats,
              or diving into the rich history of the club — this site is built for you.
            </p>
          </div>
        </section>

        {/* ── Features ────────────────────────────────────────────── */}
        <section className="mb-16">
          <h2 className="font-bebas text-3xl text-white tracking-wider mb-6">
            Features
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FEATURES.map((feature) => (
              <div
                key={feature}
                className="flex items-start gap-3 bg-stadium-surface border border-stadium-border rounded-none p-4"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-lfc-red shrink-0 mt-1.5" />
                <p className="font-inter text-white text-sm">{feature}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Data Sources ────────────────────────────────────────── */}
        <section className="mb-16">
          <h2 className="font-bebas text-3xl text-white tracking-wider mb-6">
            Data Sources
          </h2>
          <div className="space-y-4">
            {DATA_SOURCES.map(({ Icon, name, description, url }) => (
              <a
                key={name}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-4 bg-stadium-surface border border-stadium-border rounded-none p-5 hover:border-stadium-muted/50 transition-colors"
              >
                <Icon size={20} className="text-lfc-red shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-inter text-white text-sm font-semibold mb-1">
                    {name}
                  </h3>
                  <p className="font-inter text-stadium-muted text-xs leading-relaxed">
                    {description}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* ── Support / Donation ───────────────────────────────────── */}
        <section className="mb-16">
          <h2 className="font-bebas text-3xl text-white tracking-wider mb-6">
            Support This Project
          </h2>
          <div className="bg-gradient-to-br from-lfc-red/10 to-stadium-surface border border-lfc-red/20 rounded-none p-8 text-center">
            <Coffee size={32} className="text-lfc-gold mx-auto mb-4" />
            <h3 className="font-bebas text-2xl text-white tracking-wider mb-2">
              Buy Me a Coffee
            </h3>
            <p className="font-inter text-stadium-muted text-sm leading-relaxed max-w-md mx-auto mb-6">
              This site is free and always will be. If you enjoy it and want to help
              cover hosting and API costs, a small donation would mean the world.
              Every cup of coffee keeps the site running.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <a
                href="https://buymeacoffee.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-lfc-gold hover:bg-lfc-gold/90 text-stadium-bg rounded-none font-barlow font-bold uppercase tracking-[0.12em] text-sm transition-colors"
              >
                <Coffee size={16} />
                Buy Me a Coffee
              </a>
              <a
                href="https://paypal.me"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-stadium-surface2 border border-stadium-border text-stadium-muted hover:text-white rounded-none font-barlow font-semibold uppercase tracking-[0.12em] text-sm transition-colors"
              >
                PayPal
              </a>
            </div>
            <p className="font-inter text-stadium-muted text-[11px] mt-4">
              Donations are optional and do not provide any additional access or features.
            </p>
          </div>
        </section>

        {/* ── Bottom links ────────────────────────────────────────── */}
        <div className="flex flex-wrap justify-center gap-4 text-sm font-inter">
          <Link
            href="/legal"
            className="text-stadium-muted hover:text-white transition-colors"
          >
            Legal Information
          </Link>
          <span className="text-stadium-border">·</span>
          <Link
            href="/history"
            className="text-stadium-muted hover:text-white transition-colors"
          >
            Club History
          </Link>
          <span className="text-stadium-border">·</span>
          <a
            href="https://www.liverpoolfc.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-stadium-muted hover:text-white transition-colors"
          >
            Official Site
          </a>
        </div>
      </div>
    </div>
  );
}
