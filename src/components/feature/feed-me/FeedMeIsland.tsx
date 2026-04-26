'use client';

import type { MealCandidate } from '@/contracts/zod/recommendation';
import { type RecommendActionResult, regenerateAction } from '@/server/recommendation/actions';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { EmptyState, type EmptyStateVariant } from './EmptyState';
import { MealCardStack } from './MealCardStack';
import { RegenerateButton } from './RegenerateButton';
import { SkeletonStack } from './SkeletonStack';

interface FeedMeIslandProps {
  /** Client's local date string (YYYY-MM-DD) passed from the RSC page. */
  localDate: string;
}

type IslandPhase =
  | { phase: 'loading' }
  | { phase: 'success'; candidates: MealCandidate[]; runId: string }
  | { phase: 'error'; variant: EmptyStateVariant; resetAt?: string };

export function FeedMeIsland({ localDate }: FeedMeIslandProps) {
  const [islandState, setIslandState] = useState<IslandPhase>({ phase: 'loading' });
  const [isPending, startTransition] = useTransition();

  const runAction = useCallback(() => {
    setIslandState({ phase: 'loading' });
    startTransition(async () => {
      let result: RecommendActionResult;
      try {
        result = await regenerateAction({ localDate });
      } catch {
        setIslandState({
          phase: 'error',
          variant: 'data-fetch-failed',
        });
        return;
      }

      if (result.ok) {
        setIslandState({
          phase: 'success',
          candidates: result.value.candidates,
          runId: result.value.runId,
        });
      } else {
        const errCode = result.error.code;
        const variantMap: Record<typeof errCode, EmptyStateVariant> = {
          RATE_LIMITED: 'rate-limited',
          PROFILE_INCOMPLETE: 'profile-incomplete',
          DATA_FETCH_FAILED: 'data-fetch-failed',
          ENGINE_SAFETY: 'engine-safety',
          ENGINE_PARSE: 'engine-parse',
          ENGINE_UNKNOWN: 'engine-parse', // surface as generic parse error
        };
        setIslandState({
          phase: 'error',
          variant: variantMap[errCode] ?? 'data-fetch-failed',
          resetAt: result.error.resetAt,
        });
      }
    });
  }, [localDate]);

  // Fire on mount — no stale-while-revalidate needed; engine results are ephemeral.
  useEffect(() => {
    runAction();
  }, [runAction]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (islandState.phase === 'loading' || isPending) {
    return (
      <div className="w-full">
        <SkeletonStack />
      </div>
    );
  }

  if (islandState.phase === 'error') {
    return (
      <EmptyState variant={islandState.variant} resetAt={islandState.resetAt} onRetry={runAction} />
    );
  }

  // phase === 'success'
  return (
    <div className="w-full space-y-6">
      <MealCardStack candidates={islandState.candidates} />

      <div className="flex justify-center pb-8">
        <RegenerateButton onRegenerate={runAction} isPending={isPending} />
      </div>
    </div>
  );
}
