import { PageHeroSkeleton } from "@/components/ui/page-hero";
import { HubSubNavClient } from "@/components/ui/hub-subnav-client";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors PageHero + Club HubSubNavClient + pulse strip + transfer news grid. */
export default function TransfersLoading() {
  return (
    <div className="min-h-screen" aria-busy="true">
      <PageHeroSkeleton />
      <HubSubNavClient group="club" current="transfers" />
      <div className="page-container space-y-8 pb-20 pt-8 sm:pt-10">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>

        <Skeleton className="h-20 w-full" />

        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="surface space-y-3 p-4">
                <Skeleton className="aspect-[16/9] w-full" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
