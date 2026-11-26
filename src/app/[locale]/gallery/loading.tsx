import { PageHeroSkeleton } from "@/components/ui/page-hero";
import { HubSubNavClient } from "@/components/ui/hub-subnav-client";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors PageHero + Heritage HubSubNavClient + search + chips + 4:3 photo tiles. */
export default function GalleryLoading() {
  return (
    <div className="min-h-screen" aria-busy="true">
      <PageHeroSkeleton />
      <HubSubNavClient group="heritage" current="gallery" />
      <div className="page-container pb-20 pt-8 sm:pt-10">
        <Skeleton className="mb-3 h-11 w-full sm:max-w-sm" />
        <div className="mb-6 flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-24 shrink-0" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
