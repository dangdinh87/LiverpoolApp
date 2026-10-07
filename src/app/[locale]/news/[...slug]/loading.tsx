import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/** Same geometry as the article page: back link, source and time, headline, picture, excerpt, original button. */
export default function ArticleLoading() {
  return (
    <div className="min-h-screen" aria-busy="true">
      <div className="page-container max-w-5xl pb-16 pt-[calc(var(--header-h)+1rem)]">
        <Skeleton className="h-11 w-36" />
        <div className="mt-2 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
          <div className="min-w-0">
            <div className="mb-3 flex gap-3">
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-7 w-40" />
            </div>
            <div className="max-w-3xl space-y-2.5">
              <Skeleton className="h-8 w-full sm:h-10" />
              <Skeleton className="h-8 w-11/12 sm:h-10" />
              <Skeleton className="h-8 w-2/3 sm:h-10" />
            </div>
            
            <div className="mt-6 max-w-[42rem] space-y-3">
              <Skeleton className="h-4 w-24" />
              <SkeletonText lines={7} className="space-y-3.5" />
            </div>
            <Skeleton className="mt-6 h-14 w-full max-w-[42rem] sm:w-80" />
            <Skeleton className="-mx-4 mt-8 aspect-[2/1] sm:mx-0 sm:aspect-video" />
            <div className="mt-8 grid max-w-xl grid-cols-3 gap-2">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-11" />
              ))}
            </div>
          </div>
          <div className="hidden lg:block">
            <Skeleton className="h-28" />
          </div>
        </div>
      </div>
    </div>
  );
}
