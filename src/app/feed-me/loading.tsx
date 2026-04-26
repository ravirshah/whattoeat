import { SkeletonStack } from '@/components/feature/feed-me/SkeletonStack';

/**
 * Next.js Suspense fallback for the /feed-me route segment.
 * Renders immediately while the RSC page.tsx is streamed.
 */
export default function FeedMeLoading() {
  return (
    <main className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-3">
        <h1 className="text-lg font-semibold text-foreground">Feed Me</h1>
      </div>
      <div className="py-6">
        <SkeletonStack />
      </div>
    </main>
  );
}
