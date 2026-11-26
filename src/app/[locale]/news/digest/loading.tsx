import { PageHeroSkeleton } from "@/components/ui/page-hero";
import { HubSubNavClient } from "@/components/ui/hub-subnav-client";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/** Mirrors PageHero + Editorial HubSubNavClient + lead briefing + stories. */
export default function DigestLoading() {
  return (
    <div className="min-h-screen" aria-busy="true">
      <PageHeroSkeleton />
      <HubSubNavClient group="editorial" current="digest" />
      <div className="page-container pb-20 pt-8 sm:pt-10">
        <div className="mx-auto max-w-3xl">
          <div className="space-y-4">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-9 w-full sm:h-12" />
            <Skeleton className="h-9 w-3/4 sm:h-12" />
          </div>
          <div className="mt-6 max-w-[42rem] border-l-4 border-[var(--line-strong)] pl-4">
            <SkeletonText lines={4} className="space-y-3" />
          </div>
          <div className="mt-9 space-y-9">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="space-y-4 border-t border-[var(--line)] pt-7">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-7 w-5/6" />
                <SkeletonText lines={5} className="max-w-[42rem] space-y-3" />
                <Skeleton className="h-14 w-full max-w-[42rem]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
