'use server';

/**
 * Feed Me server actions.
 *
 * regenerateAction — the primary action. Assembles context, enforces the daily
 *   cap, runs the engine, persists the run, and returns typed candidates.
 *
 * All actions call requireUser() first. No userId may come from request bodies.
 */

import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

import { EngineParseError, EngineSafetyError } from '@/engine/errors';
import { recommend } from '@/engine/index';
import { type BuildContextOptions, buildContext } from '@/lib/feed-me/buildContext';
import { resolveClient } from '@/lib/feed-me/resolveClient';
import { assertWithinDailyCap } from '@/lib/rate-limit/index';
import { PROMPTS_VERSION } from '@/lib/version';
import { requireUser } from '@/server/auth/index';
import { withInstrumentation } from '@/server/instrumentation/index';
import { insertRecommendationRun } from '@/server/recommendation/repo';

import type { MealCandidate, RecommendationContext } from '@/contracts/zod/recommendation';
import type { LlmClient } from '@/engine/ports/llm';

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export type RecommendActionSuccess = {
  runId: string;
  candidates: MealCandidate[];
  context: RecommendationContext;
};

export type RecommendActionError = {
  code:
    | 'RATE_LIMITED'
    | 'PROFILE_INCOMPLETE'
    | 'DATA_FETCH_FAILED'
    | 'ENGINE_SAFETY'
    | 'ENGINE_PARSE'
    | 'ENGINE_UNKNOWN';
  message: string;
  /** ISO timestamp — only present for RATE_LIMITED */
  resetAt?: string;
};

export type RecommendActionResult =
  | { ok: true; value: RecommendActionSuccess }
  | { ok: false; error: RecommendActionError };

// ---------------------------------------------------------------------------
// Inner engine span — wrapped by withInstrumentation in the exported action
// ---------------------------------------------------------------------------

async function _runEngineSpan(
  ctx: RecommendationContext,
  recentCookTitles: string[],
  llm: LlmClient,
  userId: string,
): Promise<RecommendActionResult> {
  const start = performance.now();

  try {
    const result = await recommend(ctx, {
      llm,
      recentCookTitles,
      timeoutMs: 30_000,
    });

    const durationMs = Math.round(performance.now() - start);

    if (!result.ok) {
      const err = result.error;
      let errorCode: RecommendActionError['code'];
      if (err instanceof EngineSafetyError) {
        errorCode = 'ENGINE_SAFETY';
      } else if (err instanceof EngineParseError) {
        errorCode = 'ENGINE_PARSE';
      } else {
        errorCode = 'ENGINE_UNKNOWN';
      }

      await insertRecommendationRun({
        userId,
        context: ctx,
        candidates: null,
        errorCode,
        promptsVersion: PROMPTS_VERSION,
        durationMs,
        model: 'unknown',
        promptTokens: 0,
        completionTokens: 0,
      });

      return {
        ok: false,
        error: {
          code: errorCode,
          message:
            errorCode === 'ENGINE_SAFETY'
              ? 'All meal suggestions were filtered out — likely due to your allergen settings. Try adding more pantry items or reviewing your allergens.'
              : 'The recommendation engine returned an unexpected response. Try again in a moment.',
        },
      };
    }

    const candidates = result.value.candidates;

    const runId = await insertRecommendationRun({
      userId,
      context: ctx,
      candidates,
      errorCode: null,
      promptsVersion: PROMPTS_VERSION,
      durationMs,
      model: result.value.modelUsed,
      promptTokens: result.value.tokens.prompt,
      completionTokens: result.value.tokens.completion,
    });

    return {
      ok: true,
      value: {
        runId,
        candidates,
        context: ctx,
      },
    };
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);

    await insertRecommendationRun({
      userId,
      context: ctx,
      candidates: null,
      errorCode: 'ENGINE_UNKNOWN',
      promptsVersion: PROMPTS_VERSION,
      durationMs,
    }).catch(() => {
      // Swallow secondary failure to avoid masking the primary error.
    });

    throw err; // Re-throw so withInstrumentation can capture via Sentry.
  }
}

// ---------------------------------------------------------------------------
// Exported server action
// ---------------------------------------------------------------------------

export async function regenerateAction(
  opts?: BuildContextOptions & { llmOverride?: LlmClient },
): Promise<RecommendActionResult> {
  // Step 1: Auth
  let userId: string;
  try {
    const user = await requireUser();
    userId = user.userId;
  } catch {
    redirect('/auth/login');
  }

  // Step 2: Rate-limit check — must happen before any expensive I/O.
  const rateLimitResult = await assertWithinDailyCap(userId, 'engine:recommend');
  if (!rateLimitResult.ok) {
    const resetAt = new Date(Date.now() + rateLimitResult.retryAfterMs).toISOString();
    return {
      ok: false,
      error: {
        code: 'RATE_LIMITED',
        message: rateLimitResult.friendlyMessage,
        resetAt,
      },
    };
  }

  // Step 3: Build context
  const supabase = await createServerClient();
  const contextResult = await buildContext(supabase, userId, {
    candidateCount: opts?.candidateCount,
    localDate: opts?.localDate,
  });

  if (!contextResult.ok) {
    return {
      ok: false,
      error: {
        code: contextResult.error.code as RecommendActionError['code'],
        message: contextResult.error.message,
      },
    };
  }

  const { ctx, recentCookTitles } = contextResult.value;

  // Step 4: Resolve LLM client (or use override for testing)
  const llm = opts?.llmOverride ?? resolveClient();

  // Steps 5-6: Run engine + persist run, wrapped in instrumentation for Sentry tagging.
  const wrappedSpan = withInstrumentation(
    'engine.recommend',
    () => _runEngineSpan(ctx, recentCookTitles, llm, userId),
    { userId },
  );

  return wrappedSpan();
}
