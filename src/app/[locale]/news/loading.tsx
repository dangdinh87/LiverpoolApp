import { Skeleton } from "@/components/ui/skeleton";
import { NewsCardSkeleton } from "@/components/news/news-card";

/** Same geometry as the news page: title bar, digest banner, filter bar, headline rows. */
export default function NewsLoading() {
  return (
    <div className="min-h-screen" aria-busy="true">
      <div className="border-b border-[var(--line)]">
        <div className="page-container pb-3 pt-[calc(var(--header-h)+0.75rem)] sm:pb-4 sm:pt-[calc(var(--header-h)+1.25rem)]">
          <Skeleton className="h-9 w-40 sm:h-12" />
          <Skeleton className="mt-2 hidden h-4 w-full max-w-md sm:block" />
        </div>
      </div>

      <div className="page-container py-3 sm:py-4">
        <div aria-hidden className="surface flex items-center gap-3 border-l-4 border-l-lfc-red py-3 pl-4 pr-3 sm:gap-6 sm:pl-5 sm:pr-4">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-6 w-4/5" />
          </div>
          <Skeleton className="size-11 sm:h-11 sm:w-44" />
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
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-8">
          {Array.from({ length: 8 }, (_, i) => (
            <NewsCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
