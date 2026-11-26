import { PageHeroSkeleton } from "@/components/ui/page-hero";
import { MatchCentreNav } from "@/components/fixtures/match-centre-nav";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors PageHero + MatchCentreNav + the 20-row table card (44px rows). */
export default function StandingsLoading() {
  return (
    <div className="min-h-screen" aria-busy="true">
      <PageHeroSkeleton image="/assets/lfc/stadium/anfield-champions-league.webp" />
      <MatchCentreNav active="standings" />
      <div className="page-container pb-20 pt-8 sm:pt-10">
        <div className="surface overflow-hidden">
          <div className="h-[2.6rem] border-b border-[var(--line)] bg-[var(--surface-1)]" />
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i} className="flex h-11 items-center gap-3 border-b border-[var(--line)] px-3 last:border-0">
              <Skeleton className="h-4 w-5" />
              <Skeleton className="size-6 shrink-0" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-7" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-5 w-8" />
            </div>
          ))}
          <div className="h-[2.75rem] border-t border-[var(--line)]" />
        </div>
      </div>
    </div>
  );
}
