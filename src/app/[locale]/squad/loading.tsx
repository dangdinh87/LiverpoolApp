import { PageHeroSkeleton } from "@/components/ui/page-hero";
import { HubSubNavClient } from "@/components/ui/hub-subnav-client";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors PageHero + Club HubSubNavClient + search + position chips + player cards. */
export default function SquadLoading() {
  return (
    <div className="min-h-screen" aria-busy="true">
      <PageHeroSkeleton />
      <HubSubNavClient group="club" current="squad" />
      <div className="page-container pb-20 pt-8 sm:pt-10">
        <Skeleton className="h-11 w-full sm:max-w-sm" />
        <div className="-mx-4 mt-4 flex gap-1.5 overflow-hidden border-b border-[var(--line)] px-4 py-2.5 sm:-mx-6 sm:gap-2 sm:px-6 lg:-mx-8 lg:px-8">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-11 w-24 shrink-0" />
          ))}
        </div>
        <Skeleton className="mb-3 mt-6 h-8 w-36 sm:mb-4" />
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            <li key={i} className="surface flex min-h-[4.5rem] items-center gap-3 p-2 sm:block sm:min-h-0 sm:overflow-hidden sm:p-0">
              <Skeleton className="size-16 shrink-0 sm:aspect-[4/5] sm:size-auto sm:w-full" />
              <div className="flex-1 space-y-2 sm:h-24 sm:p-4">
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-3.5 w-1/2" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
