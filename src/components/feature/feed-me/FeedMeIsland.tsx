'use client';

import type { MealCandidate } from '@/contracts/zod/recommendation';
import { type RecommendActionResult, regenerateAction } from '@/server/recommendation/actions';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { EmptyState, type EmptyStateVariant } from './EmptyState';
import { MealCardStack } from './MealCardStack';
import { RegenerateButton } from './RegenerateButton';
import { SkeletonStack } from './SkeletonStack';

interface FeedMeIslandProps {
  /** Client's local date string (YYYY-MM-DD) passed from the RSC page. */
  localDate: string;
  /**
   * Most recent successful run from the last 24h, fetched server-side.
   * When present, the island renders these candidates immediately and skips
   * the auto-fire on mount — the user can still tap "Get new suggestions".
   */
  initialRun: { runId: string; candidates: MealCandidate[] } | null;
}

type IslandPhase =
  | { phase: 'loading' }
  | { phase: 'success'; candidates: MealCandidate[]; runId: string }
  | { phase: 'error'; variant: EmptyStateVariant; resetAt?: string };

export function FeedMeIsland({ localDate, initialRun }: FeedMeIslandProps) {
  const [islandState, setIslandState] = useState<IslandPhase>(
    initialRun
      ? { phase: 'success', candidates: initialRun.candidates, runId: initialRun.runId }
      : { phase: 'loading' },
  );
  const [isPending, startTransition] = useTransition();
  // Guards against the StrictMode double-mount in dev firing the action twice.
  const didAutoRunRef = useRef(false);

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

  // Fire on mount only when there is no cached run to display. The ref guard
  // prevents the StrictMode double-mount in dev from triggering two parallel
  // engine calls (which would burn duplicate Gemini quota).
  useEffect(() => {
    if (initialRun) return;
    if (didAutoRunRef.current) return;
    didAutoRunRef.current = true;
    runAction();
  }, [initialRun, runAction]);

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
      <MealCardStack candidates={islandState.candidates} runId={islandState.runId} />

      <div className="flex justify-center pb-8">
        <RegenerateButton onRegenerate={runAction} isPending={isPending} />
      </div>
    </div>
  );
}
