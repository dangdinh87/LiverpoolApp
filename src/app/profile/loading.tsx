import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the profile page: identity header, tab bar, settings card. */
export default function ProfileLoading() {
  return (
    <div role="status" aria-busy="true" className="pt-[calc(var(--header-h)+1.5rem)] pb-20 sm:pt-[calc(var(--header-h)+2.5rem)]">
      <div className="page-container max-w-4xl">
        <div className="surface flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-6">
          <Skeleton className="size-16 shrink-0 rounded-full sm:size-20" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-3 w-44" />
          </div>
          <Skeleton className="h-11 w-full sm:w-32" />
        </div>
        <div className="mt-4 flex h-12 items-center gap-6 border-b border-[var(--line)]">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-3 w-24" />
          ))}
        </div>
        <div className="surface mt-4 p-4 sm:p-6">
          <div className="flex flex-col gap-6 sm:flex-row">
            <Skeleton className="mx-auto size-24 shrink-0 rounded-full sm:mx-0" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-11 w-36" />
            </div>
          </div>
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
