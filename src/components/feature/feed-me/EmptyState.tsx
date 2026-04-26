'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

export type EmptyStateVariant =
  | 'profile-incomplete'
  | 'engine-safety'
  | 'engine-parse'
  | 'rate-limited'
  | 'data-fetch-failed';

interface EmptyStateProps {
  variant: EmptyStateVariant;
  /** ISO timestamp — only used by the rate-limited variant. */
  resetAt?: string;
  /** Called when the user clicks the retry CTA (engine-parse / data-fetch-failed variants). */
  onRetry?: () => void;
}

const COPY: Record<
  EmptyStateVariant,
  { heading: string; body: string; primaryLabel: string; primaryHref?: string }
> = {
  'profile-incomplete': {
    heading: 'Finish setting up your profile',
    body: 'Feed Me needs your goals, height, weight, and birthdate to calculate your macro targets. It only takes a minute.',
    primaryLabel: 'Go to Profile',
    primaryHref: '/profile/edit',
  },
  'engine-safety': {
    heading: 'Nothing matched your current settings',
    body: "All of today's suggestions were filtered out — most likely because they conflict with your allergen list or your pantry is very limited. Try adding more pantry items or reviewing your allergens.",
    primaryLabel: 'Review settings',
    primaryHref: '/profile/edit',
  },
  'engine-parse': {
    heading: 'Our suggestion engine had a moment',
    body: "The response from the AI wasn't quite right. This is rare — tap Try Again and it should sort itself out.",
    primaryLabel: 'Try again',
  },
  'rate-limited': {
    heading: "You've reached your daily limit",
    body: "Feed Me is designed to be used mindfully — you get a generous number of refreshes per day, and you've used them all. Check back tomorrow.",
    primaryLabel: 'View saved recipes',
    primaryHref: '/recipes/saved',
  },
  'data-fetch-failed': {
    heading: "We couldn't load your data",
    body: 'Something went wrong while fetching your pantry, profile, or check-in. Check your connection and try again.',
    primaryLabel: 'Try again',
  },
};

export function EmptyState({ variant, resetAt, onRetry }: EmptyStateProps) {
  const copy = COPY[variant];
  const isRetryable = variant === 'engine-parse' || variant === 'data-fetch-failed';

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 px-6 text-center">
      <div className="space-y-2 max-w-sm">
        <h2 className="text-xl font-semibold text-foreground">{copy.heading}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{copy.body}</p>
        {variant === 'rate-limited' && resetAt && (
          <p className="text-xs text-muted-foreground">
            Resets at{' '}
            {new Date(resetAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {isRetryable && onRetry ? (
        <Button onClick={onRetry} variant="default">
          {copy.primaryLabel}
        </Button>
      ) : copy.primaryHref ? (
        <Button asChild variant="default">
          <Link href={copy.primaryHref}>{copy.primaryLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}
