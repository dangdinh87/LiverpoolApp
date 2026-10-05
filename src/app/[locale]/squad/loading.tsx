import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors PageHero + search + position chips + player card grid. */
export default function SquadLoading() {
  return (
    <div className="min-h-screen" aria-busy="true">
      <div className="border-b border-[var(--line)]">
        <div className="page-container pb-6 pt-[calc(var(--header-h)+1.5rem)] sm:pb-10 sm:pt-[calc(var(--header-h)+3rem)]">
          <Skeleton className="mb-3 h-3.5 w-28" />
          <Skeleton className="h-12 w-52 sm:h-16" />
          <Skeleton className="mt-4 h-4 w-32" />
        </div>
      </div>
      <div className="page-container pb-16 pt-5 sm:pt-8">
        <Skeleton className="h-11 w-full sm:max-w-sm" />
        <div className="-mx-4 mt-4 flex gap-2 overflow-hidden border-b border-[var(--line)] px-4 py-2.5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className={`h-10 shrink-0 ${i === 0 ? "w-24" : "w-20"}`} />
          ))}
        </div>
        <Skeleton className="mb-4 mt-6 h-8 w-44" />
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            <li key={i} className="surface overflow-hidden">
              <Skeleton className="aspect-[4/5] w-full" />
              <div className="h-[5.5rem] space-y-2 p-3 sm:h-24 sm:p-4">
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-3.5 w-1/3" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
