import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/** Mirrors the about page: hero, intro copy, feature tiles. */
export default function AboutLoading() {
  return (
    <div aria-busy="true" className="bg-stadium-bg">
      <div className="border-b border-[var(--line)]">
        <div className="page-container pb-4 pt-[calc(var(--header-h)+0.75rem)] sm:pb-10 sm:pt-[calc(var(--header-h)+3rem)]">
          <Skeleton className="mb-1 h-3 w-20 sm:mb-2" />
          <Skeleton className="h-[5.25rem] w-11/12 sm:h-16 sm:w-1/2" />
          <Skeleton className="mt-2 h-4 w-full max-w-xl sm:mt-3" />
        </div>
      </div>
      <div className="page-container pb-20 pt-8 sm:pt-12">
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
