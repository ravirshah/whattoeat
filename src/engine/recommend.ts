import type { RecommendationContext, RecommendationResult } from '@/contracts/zod';
import type { MealCandidate } from '@/contracts/zod';
import type { EngineResult } from '@/engine/errors';
import {
  EngineNoCandidatesError,
  EngineTimeoutError,
  LlmInvalidJsonError,
  LlmRefusalError,
  fail,
  ok,
} from '@/engine/errors';
import { filterCandidates } from '@/engine/filter';
import {
  DetailResponseSchema,
  PlanResponseSchema,
  RationaleResponseSchema,
  buildDetailPrompt,
  buildPlanPrompt,
  buildRationalePrompt,
} from '@/engine/prompt';
import type { PlanResponse } from '@/engine/prompt';
import { scoreCandidate } from '@/engine/score';
import type { LlmClient, Logger } from '@/engine/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecommendDeps {
  llm: LlmClient;
  logger?: Logger;
  recentCookTitles?: string[];
  timeoutMs?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wraps a promise with a timeout; throws EngineTimeoutError on expiry. */
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new EngineTimeoutError(`Engine timed out after ${ms}ms`)), ms);
  });
  try {
    const result = await Promise.race([promise, timeout]);
    return result;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Core orchestration (no timeout wrapping here — withTimeout wraps recommend)
// ---------------------------------------------------------------------------

async function _recommend(
  ctx: RecommendationContext,
  deps: RecommendDeps,
): Promise<EngineResult<RecommendationResult>> {
  const { llm, logger, recentCookTitles = [] } = deps;
  const startMs = Date.now();

  // ------------------------------------------------------------------
  // 1. Plan call — cheap model produces N concept sketches
  // ------------------------------------------------------------------
  const planPrompts = buildPlanPrompt(ctx);
  let planResponse: Awaited<ReturnType<typeof llm.generateStructured<PlanResponse>>>;
  try {
    planResponse = await llm.generateStructured({
      ...planPrompts,
      schema: PlanResponseSchema,
      modelHint: 'cheap',
      cacheKey: `plan:${JSON.stringify(planPrompts.user).slice(0, 64)}`,
    });
  } catch (err) {
    logger?.error('Plan call failed', { err: String(err) });
    if (err instanceof EngineTimeoutError) return fail(err);
    if (err instanceof LlmRefusalError) return fail(err);
    if (err instanceof Error && err.message.toLowerCase().includes('refusal'))
      return fail(new LlmRefusalError(err.message, err));
    if (err instanceof Error) return fail(new LlmInvalidJsonError(err.message, err));
    return fail(new LlmInvalidJsonError('Unknown plan call error', err));
  }

  const concepts = planResponse.value.concepts;
  logger?.info(`Plan call returned ${concepts.length} concepts`);

  // ------------------------------------------------------------------
  // 2. Detail calls — parallel, one per concept
  // ------------------------------------------------------------------
  const detailResults = await Promise.allSettled(
    concepts.map(async (concept) => {
      const detailPrompts = buildDetailPrompt(concept, ctx);
      const res = await llm.generateStructured({
        ...detailPrompts,
        schema: DetailResponseSchema,
        modelHint: 'strong',
        cacheKey: `detail:${concept.title.slice(0, 32)}`,
      });
      return res;
    }),
  );

  const rawCandidates: MealCandidate[] = [];
  for (const r of detailResults) {
    if (r.status === 'fulfilled') {
      rawCandidates.push(r.value.value as MealCandidate);
    } else {
      logger?.warn('Detail call failed', { reason: String(r.reason) });
    }
  }

  if (rawCandidates.length === 0) {
    return fail(new LlmInvalidJsonError('All detail calls failed'));
  }

  // ------------------------------------------------------------------
  // 3. Filter — allergy + recency
  // ------------------------------------------------------------------
  const { passed, droppedAllergen } = filterCandidates(rawCandidates, ctx, recentCookTitles);

  logger?.info(`Filter: ${droppedAllergen.length} dropped (allergen), ${passed.length} passed`);

  if (passed.length === 0) {
    return fail(new EngineNoCandidatesError());
  }

  // ------------------------------------------------------------------
  // 4. Score + rank
  // ------------------------------------------------------------------
  const scored = passed
    .map((c) => ({ candidate: c, score: scoreCandidate(c, ctx) }))
    .sort((a, b) => b.score - a.score);

  // ------------------------------------------------------------------
  // 5. Cap
  // ------------------------------------------------------------------
  const top = scored.slice(0, ctx.request.candidateCount).map((s) => s.candidate);

  // ------------------------------------------------------------------
  // 6. Rationale call — non-fatal on failure
  // ------------------------------------------------------------------
  let rationale = '';
  let totalTokens = {
    prompt: planResponse.tokens.prompt,
    completion: planResponse.tokens.completion,
  };
  let modelUsed = planResponse.modelUsed;

  try {
    const rationalePrompts = buildRationalePrompt(
      top.map((c) => c.title),
      ctx,
    );
    const rationaleRes = await llm.generateStructured({
      ...rationalePrompts,
      schema: RationaleResponseSchema,
      modelHint: 'cheap',
    });
    rationale = rationaleRes.value.overall;
    totalTokens = {
      prompt: totalTokens.prompt + rationaleRes.tokens.prompt,
      completion: totalTokens.completion + rationaleRes.tokens.completion,
    };
    modelUsed = rationaleRes.modelUsed;
  } catch (err) {
    logger?.warn('Rationale call failed (non-fatal)', { err: String(err) });
    rationale = 'These picks suit your current goals and pantry.';
  }

  // ------------------------------------------------------------------
  // 7. Return
  // ------------------------------------------------------------------
  return ok({
    candidates: top,
    rationale,
    modelUsed,
    tokens: totalTokens,
    latencyMs: Date.now() - startMs,
  });
}

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

/**
 * Recommends meals given the user's context and injected dependencies.
 * Returns an EngineResult — never throws (programmer errors excepted).
 */
export async function recommend(
  ctx: RecommendationContext,
  deps: RecommendDeps,
): Promise<EngineResult<RecommendationResult>> {
  const inner = _recommend(ctx, deps);
  if (deps.timeoutMs != null) {
    try {
      return await withTimeout(inner, deps.timeoutMs);
    } catch (err) {
      if (err instanceof EngineTimeoutError) return fail(err);
      if (err instanceof Error) return fail(new LlmInvalidJsonError(err.message, err));
      return fail(new LlmInvalidJsonError('Unknown timeout wrapper error', err));
    }
  }
  return inner;
}
