import { Skeleton } from '@/components/ui/skeleton';

/** Three placeholder cards that match the visual footprint of MealCard. */
export function SkeletonStack() {
  return (
    <div className="flex flex-col gap-4 w-full max-w-lg mx-auto px-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list, order never changes
          key={i}
          className="rounded-2xl border border-border bg-card p-5 space-y-4"
        >
          {/* Title + time */}
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-5 w-2/3 rounded-md" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
          {/* One-line why */}
          <Skeleton className="h-3 w-full rounded-md" />
          <Skeleton className="h-3 w-5/6 rounded-md" />
          {/* Macro row */}
          <div className="flex gap-3 pt-1">
            <Skeleton className="h-8 w-16 rounded-lg" />
            <Skeleton className="h-8 w-16 rounded-lg" />
            <Skeleton className="h-8 w-16 rounded-lg" />
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <Skeleton className="h-9 w-24 rounded-xl" />
            <Skeleton className="h-9 w-24 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
