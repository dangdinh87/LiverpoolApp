import { PageHeroSkeleton } from "@/components/ui/page-hero";
import { HubSubNavClient } from "@/components/ui/hub-subnav-client";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/** Mirrors PageHero + Heritage HubSubNavClient + intro copy + feature tiles. */
export default function AboutLoading() {
  return (
    <div className="min-h-screen" aria-busy="true">
      <PageHeroSkeleton />
      <HubSubNavClient group="heritage" current="about" />
      <div className="page-container pb-20 pt-8 sm:pt-10">
        <div className="max-w-3xl space-y-10">
          <div className="space-y-4">
            <Skeleton className="h-9 w-56" />
            <SkeletonText lines={5} />
            <Skeleton className="h-24" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
