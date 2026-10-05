import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { Fixture } from "@/lib/types/football";
import { formatDayMonth, formatMatchTime } from "@/lib/format-match-date";

const LFC_CREST = "/assets/lfc/crest.webp";

function Team({ name, logo }: { name: string; logo?: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
      <div className="relative size-10 shrink-0">
        <Image src={logo || LFC_CREST} alt="" fill sizes="40px" className="object-contain" unoptimized />
      </div>
      <span className="w-full truncate text-xs font-semibold text-white">{name}</span>
    </div>
  );
}

/** Compact next-match card. Sidebar on desktop, banner after the article on phones. */
export async function ArticleNextMatch({ fixture, className }: { fixture: Fixture; className?: string }) {
  const [t, locale] = await Promise.all([getTranslations("NextMatch"), getLocale()]);
  const { teams, fixture: f } = fixture;
  const date = new Date(f.date);

  return (
    <Link href="/fixtures" className={`surface-interactive block p-4 ${className ?? ""}`}>
      <p className="section-label mb-3 text-stadium-muted">{t("title")}</p>
      <div className="flex items-center justify-between gap-3">
        <Team name={teams.home.name} logo={teams.home.logo} />
        <div className="flex shrink-0 flex-col items-center px-1">
          <span className="font-bebas text-2xl leading-none text-stadium-muted">VS</span>
          <span className="mt-1 font-barlow text-sm font-semibold text-white">{formatDayMonth(date, locale)}</span>
          <span className="text-xs text-stadium-muted">{formatMatchTime(date)}</span>
        </div>
        <Team name={teams.away.name} logo={teams.away.logo} />
      </div>
      <p className="mt-4 flex items-center justify-center gap-1.5 border-t border-[var(--line)] pt-3 font-barlow text-xs font-semibold uppercase tracking-[0.12em] text-stadium-muted">
        {t("viewAllFixtures")}
        <ArrowRight className="size-3.5" aria-hidden />
      </p>
    </Link>
  );
}
