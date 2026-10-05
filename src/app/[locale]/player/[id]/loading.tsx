import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the compact player hero + facts grid + stats cards. */
export default function PlayerLoading() {
  return (
    <div className="min-h-screen" aria-busy="true">
      <div className="border-b border-[var(--line)]">
        <div className="page-container pb-6 pt-[calc(var(--header-h)+1rem)] sm:pb-10 sm:pt-[calc(var(--header-h)+1.5rem)]">
          <Skeleton className="mb-4 h-10 w-36" />
          <div className="flex items-end gap-4 sm:gap-8 md:items-center">
            <Skeleton className="aspect-[4/5] w-32 shrink-0 sm:w-56 md:order-2 md:ml-auto md:w-72 lg:w-80" />
            <div className="min-w-0 flex-1 space-y-3 md:order-1">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-12 w-16 sm:h-16" />
              <Skeleton className="h-10 w-full max-w-sm sm:h-14" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-11 w-36" />
            </div>
          </div>
        </div>
      </div>
      <div className="page-container space-y-10 pb-20 pt-8 sm:space-y-14 sm:pt-12">
        <section>
          <Skeleton className="mb-4 h-10 w-48 sm:mb-6" />
          <div className="grid grid-cols-2 gap-px sm:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-[4.25rem]" />)}
          </div>
        </section>
        <section>
          <Skeleton className="mb-4 h-10 w-64 sm:mb-6" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        </section>
      </div>
    </div>
  );
}
