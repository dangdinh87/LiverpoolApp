import { getTranslations } from "next-intl/server";
import { Target } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { TeamCrest } from "@/components/ui/team-crest";
import { displayTeamName } from "@/components/fixtures/team-name";
import type { Fixture } from "@/lib/types/football";

const LFC_CREST = "/assets/lfc/crest.webp";
const crest = (team: Fixture["teams"]["home"]) => (team.id === 40 ? LFC_CREST : team.logo);

/** Homepage nudge to predict the next match, with a way to the season's prediction table. */
export async function PredictCta({ fixture }: { fixture: Fixture }) {
  const t = await getTranslations("Home.predict");
  const { teams, fixture: f } = fixture;
  return (
    <section aria-labelledby="home-predict" className="surface reveal p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-lfc-gold">
        <Target className="size-4" aria-hidden />
        <span id="home-predict">{t("title")}</span>
      </p>
      <div className="mt-3 flex items-center gap-3">
        <span className="relative size-8 shrink-0">
          <TeamCrest src={crest(teams.home)} name={teams.home.name} sizes="32px" />
        </span>
        <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-white">
          {displayTeamName(teams.home.name)} <span className="text-stadium-muted">v</span> {displayTeamName(teams.away.name)}
        </p>
        <span className="relative size-8 shrink-0">
          <TeamCrest src={crest(teams.away)} name={teams.away.name} sizes="32px" />
        </span>
      </div>
      <div className="mt-4 flex gap-2">
        <Link
          href={`/fixtures/${f.id}#predict-title`}
          className="inline-flex min-h-11 flex-1 items-center justify-center bg-lfc-red px-4 font-barlow text-sm font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-lfc-red-dark active:scale-[0.98]"
        >
          {t("cta")}
        </Link>
        <Link
          href="/predictions"
          className="inline-flex min-h-11 items-center justify-center border border-[var(--line-strong)] px-4 font-barlow text-sm font-semibold uppercase tracking-[0.1em] text-stadium-muted transition-colors hover:border-white/40 hover:text-white"
        >
          {t("table")}
        </Link>
      </div>
    </section>
  );
}
