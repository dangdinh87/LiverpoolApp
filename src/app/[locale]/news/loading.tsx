import { PageHeroSkeleton } from "@/components/ui/page-hero";
import { HubSubNavClient } from "@/components/ui/hub-subnav-client";
import { Skeleton } from "@/components/ui/skeleton";
import { NewsCardSkeleton } from "@/components/news/news-card";

/** Mirrors PageHero + Editorial HubSubNavClient + digest banner + headline rows. */
export default function NewsLoading() {
  return (
    <div className="min-h-screen" aria-busy="true">
      <PageHeroSkeleton />
      <HubSubNavClient group="editorial" current="news" />
      <div className="page-container pb-20 pt-8 sm:pt-10">
        <div aria-hidden className="surface mb-6 flex items-center gap-3 border-l-4 border-l-lfc-red py-3 pl-4 pr-3 sm:gap-6 sm:pl-5 sm:pr-4">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-6 w-4/5" />
          </div>
          <Skeleton className="size-11 sm:h-11 sm:w-44" />
        </div>

        <div className="mb-4 flex items-center gap-2 border-b border-[var(--line)] pb-3">
          <Skeleton className="h-11 flex-1 sm:max-w-sm sm:flex-none sm:basis-80" />
          <Skeleton className="ml-auto h-11 w-[76px]" />
          <Skeleton className="size-11" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-8">
          {Array.from({ length: 8 }, (_, i) => (
            <NewsCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
