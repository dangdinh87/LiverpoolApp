import { PageHeroSkeleton } from "@/components/ui/page-hero";
import { MatchCentreNav } from "@/components/fixtures/match-centre-nav";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors PageHero + MatchCentreNav + overview tiles + two chart cards. */
export default function StatsLoading() {
  return (
    <div className="min-h-screen" aria-busy="true">
      <PageHeroSkeleton image="/assets/lfc/stadium/anfield-champions-league.webp" />
      <MatchCentreNav active="stats" />
      <div className="page-container pb-20 pt-8 sm:pt-10">
        <div className="space-y-10 sm:space-y-14">
          <section>
            <Skeleton className="mb-4 h-10 w-52 sm:mb-6" />
            <div className="surface space-y-3 p-4 sm:p-6">
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-[4.5rem] sm:h-[5.75rem]" />)}
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[4.5rem] sm:h-[5.75rem]" />)}
              </div>
            </div>
          </section>
          <section className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="surface p-4 sm:p-6">
                <Skeleton className="mb-4 h-7 w-40" />
                <Skeleton className="h-[280px] w-full" />
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
