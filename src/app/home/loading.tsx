import { Skeleton } from '@/components/ui/skeleton';

export default function HomeLoading() {
  return (
    <div className="min-h-dvh bg-background px-4 pb-24">
      {/* Header skeleton */}
      <div className="pt-12 pb-6 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-64" />
      </div>

      {/* CTA skeleton */}
      <Skeleton className="h-14 w-full rounded-2xl mb-6" />

      {/* Bento grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Skeleton className="sm:col-span-2 h-48 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="sm:col-span-2 h-24 rounded-2xl" />
      </div>
    </div>
  );
}
