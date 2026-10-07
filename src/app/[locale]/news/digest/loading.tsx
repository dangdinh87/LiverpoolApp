import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/** Same geometry as a digest page: back link, badge row, headline, intro, stories. */
export default function DigestLoading() {
  return (
    <div className="min-h-screen" aria-busy="true">
      <div className="page-container max-w-3xl pb-20 pt-[calc(var(--header-h)+1rem)]">
        <Skeleton className="h-11 w-36" />
        <div className="mt-2 space-y-4">
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
  );
}
