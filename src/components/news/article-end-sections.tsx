import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { displayTeamName } from "@/components/fixtures/team-name";
import type { Fixture } from "@/lib/types/football";
import { LocalMatchDay, LocalMatchTime } from "@/components/ui/local-time";
import { TeamCrest } from "@/components/ui/team-crest";

const LFC_ID = 40;
const LFC_CREST = "/assets/lfc/crest.webp";

function Team({ team }: { team: Fixture["teams"]["home"] }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
      <div className="relative size-10 shrink-0">
        <TeamCrest src={team.id === LFC_ID ? LFC_CREST : team.logo} name={team.name} sizes="40px" />
      </div>
      <span className="w-full truncate text-xs font-semibold text-white">{displayTeamName(team.name)}</span>
    </div>
  );
}

/** Compact next-match card. Sidebar on desktop, banner after the article on phones. */
export async function ArticleNextMatch({ fixture, className }: { fixture: Fixture; className?: string }) {
  const [t, locale] = await Promise.all([getTranslations("NextMatch"), getLocale()]);
  const { teams, fixture: f } = fixture;
  const uiLocale = locale === "vi" ? "vi" : "en";

  return (
    <Link href="/fixtures" className={`surface-interactive block p-4 ${className ?? ""}`}>
      <p className="section-label mb-3 text-stadium-muted">{t("title")}</p>
      <div className="flex items-center justify-between gap-3">
        <Team team={teams.home} />
        <div className="flex shrink-0 flex-col items-center px-1">
          <span className="font-bebas text-2xl leading-none text-stadium-muted">VS</span>
          <span className="mt-1 font-barlow text-sm font-semibold text-white tabular-nums">
            <LocalMatchDay iso={f.date} locale={uiLocale} />
          </span>
          <span className="text-xs text-stadium-muted tabular-nums">
            <LocalMatchTime iso={f.date} locale={uiLocale} />
          </span>
        </div>
        <Team team={teams.away} />
      </div>
      <p className="mt-4 flex items-center justify-center gap-1.5 border-t border-[var(--line)] pt-3 font-barlow text-xs font-semibold uppercase tracking-[0.12em] text-stadium-muted">
        {t("viewAllFixtures")}
        <ArrowRight className="size-3.5" aria-hidden />
      </p>
    </Link>
  );
}
