import { cn } from '@/components/ui/utils';

/**
 * Skeleton — animated placeholder for content that is loading.
 * Used by SkeletonStack in the Feed Me flow.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}
