import { cn } from '@/components/ui/utils';
import { SparklesIcon } from 'lucide-react';
import Link from 'next/link';

export function FeedMeCta() {
  return (
    <Link
      href="/feed-me"
      className={cn(
        // Layout
        'flex items-center justify-center gap-3',
        'w-full rounded-2xl py-5 px-6',
        // Typography
        'text-lg font-bold tracking-tight',
        // Colors (token-only — no raw hex)
        'bg-accent text-accent-foreground',
        // Interaction — resting shimmer invites tap; spring-feel scale on press
        'feedme-shimmer',
        'transition-transform duration-200 ease-out',
        'hover:scale-[1.02] hover:shadow-3',
        'active:scale-[0.98]',
        // Focus
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      )}
    >
      <SparklesIcon className="w-5 h-5 flex-shrink-0" />
      Feed Me
    </Link>
  );
}
