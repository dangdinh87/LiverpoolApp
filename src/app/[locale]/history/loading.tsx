import { PageHeroSkeleton } from "@/components/ui/page-hero";
import { HubSubNavClient } from "@/components/ui/hub-subnav-client";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

/** Mirrors PageHero + Heritage HubSubNavClient + section nav + timeline cards. */
export default function HistoryLoading() {
  return (
    <div className="min-h-screen" aria-busy="true">
      <PageHeroSkeleton />
      <HubSubNavClient group="heritage" current="history" />
      <div className="page-container pb-20 pt-8 sm:pt-10">
        <div className="mb-8 flex gap-4 border-b border-[var(--line)] pb-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
        <Skeleton className="mb-6 h-9 w-48" />
        <div className="space-y-6 border-l border-[var(--line-strong)] pl-8 md:mx-auto md:max-w-2xl">
          <SkeletonCard aspect="aspect-[16/9]" />
          <SkeletonCard aspect="aspect-[16/9]" />
        </div>
      </div>
    </div>
  );
}
