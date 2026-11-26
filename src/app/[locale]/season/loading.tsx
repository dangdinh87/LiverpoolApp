import { PageHeroSkeleton } from "@/components/ui/page-hero";
import { MatchCentreNav } from "@/components/fixtures/match-centre-nav";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors PageHero + MatchCentreNav + pulse strip + match cards. */
export default function SeasonLoading() {
  return (
    <div className="min-h-screen" aria-busy="true">
      <PageHeroSkeleton image="/assets/lfc/stadium/anfield-champions-league.webp" />
      <MatchCentreNav active="fixtures" />
      <div className="page-container pb-20 pt-8 sm:pt-10">
        <div className="flex gap-2 overflow-hidden">
          <Skeleton className="h-11 w-32 shrink-0" />
          <Skeleton className="h-11 w-36 shrink-0" />
          <Skeleton className="h-11 w-40 shrink-0" />
        </div>
        <Skeleton className="mt-3 h-4 w-64" />
        <Skeleton className="mt-4 h-5 w-32" />
        <ul className="mt-3 space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i}><Skeleton className="h-[8.75rem] w-full sm:h-[9.5rem]" /></li>
          ))}
        </ul>
      </div>
    </div>
  );
}
