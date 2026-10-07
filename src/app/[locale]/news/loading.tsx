import { Skeleton } from "@/components/ui/skeleton";
import { NewsCardSkeleton } from "@/components/news/news-card";

/** Same geometry as the news page: hero, digest card, filter bar, headline rows. */
export default function NewsLoading() {
  return (
    <div className="min-h-screen" aria-busy="true">
      <div className="border-b border-[var(--line)]">
        <div className="page-container pt-[calc(var(--header-h)+0.75rem)] pb-4 sm:pb-10 sm:pt-[calc(var(--header-h)+3rem)]">
          <Skeleton className="mb-2 h-4 w-32" />
          <Skeleton className="h-10 w-40 sm:h-16" />
          <Skeleton className="mt-3 h-4 w-full max-w-md" />
        </div>
      </div>

      <div className="page-container pb-4 pt-4 sm:pb-6 sm:pt-6">
        <div aria-hidden className="surface space-y-3 border-l-4 border-l-lfc-red p-4 sm:p-6">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-8 w-4/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-12 w-full sm:h-11 sm:w-44" />
        </div>
      </div>

      <div className="border-b border-[var(--line)]">
        <div className="page-container flex items-center gap-2 py-2">
          <Skeleton className="h-11 flex-1 sm:max-w-sm sm:flex-none sm:basis-80" />
          <Skeleton className="ml-auto h-11 w-[76px]" />
          <Skeleton className="size-11" />
        </div>
      </div>

      <div className="page-container pb-12 pt-3 sm:pt-5">
        <div className="sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <NewsCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
