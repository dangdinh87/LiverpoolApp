import { PageHeroSkeleton } from "@/components/ui/page-hero";
import { HubSubNavClient } from "@/components/ui/hub-subnav-client";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors PageHero + Club HubSubNavClient + next-match impact + sidelined player cards. */
export default function InjuriesLoading() {
  return (
    <div className="min-h-screen" aria-busy="true">
      <PageHeroSkeleton />
      <HubSubNavClient group="club" current="injuries" />
      <div className="page-container space-y-8 pb-20 pt-8 sm:pt-10">
        <div className="surface flex flex-col gap-4 border-t-2 border-t-lfc-red p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-3.5">
            <Skeleton className="size-12 shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-3.5 w-44" />
            </div>
          </div>
          <Skeleton className="h-11 w-40 shrink-0" />
        </div>

        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="surface flex items-start gap-3.5 p-4">
                <Skeleton className="size-14 shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
