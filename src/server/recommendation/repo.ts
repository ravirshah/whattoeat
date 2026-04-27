/**
 * Recommendation runs repo — persists a record of every engine invocation.
 *
 * Uses the Drizzle service-role client (not the RLS-anon client) because:
 *   - The insert happens after the engine call completes, not in response to a
 *     direct user mutation.
 *   - The RLS policy on recommendation_runs is `SELECT` only for the anon role;
 *     INSERT is granted to service_role.
 *
 * Callers (server actions) are responsible for passing the correct userId.
 * The repo does not call requireUser().
 */

import type { RecommendationContext } from '@/contracts/zod/recommendation';
import type { MealCandidate } from '@/contracts/zod/recommendation';
import { db } from '@/db/client';
import { recommendation_runs } from '@/db/schema/recommendation-runs';
import { and, desc, eq, gte, sql } from 'drizzle-orm';

export interface InsertRunArgs {
  userId: string;
  /** The full context passed to the engine. Stored as JSONB for debugging. */
  context: RecommendationContext;
  /**
   * The engine result candidates. Empty array when the engine returned an error
   * (we still record the run for rate-limit accounting).
   */
  candidates: MealCandidate[] | null;
  /** Engine error code if the run failed. Null on success. */
  errorCode: string | null;
  /** Prompt template version from the engine. */
  promptsVersion: string;
  /** Wall-clock time for the full engine call in milliseconds. */
  durationMs: number;
  /** Model name used (from the engine result, or 'unknown' on error). */
  model?: string;
  /** Token counts from the LLM response. */
  promptTokens?: number;
  completionTokens?: number;
}

export async function insertRecommendationRun(args: InsertRunArgs): Promise<string> {
  const [row] = await db
    .insert(recommendation_runs)
    .values({
      user_id: args.userId,
      context_snapshot: args.context,
      // candidates is NOT NULL in schema — use empty array for error runs
      candidates: args.candidates ?? [],
      model: args.model ?? 'unknown',
      prompts_version: args.promptsVersion,
      prompt_tokens: args.promptTokens ?? 0,
      completion_tokens: args.completionTokens ?? 0,
      latency_ms: args.durationMs,
    })
    .returning({ id: recommendation_runs.id });

  if (!row) {
    throw new Error('insertRecommendationRun: Drizzle returned no rows — check schema types.');
  }

  return row.id;
}

export interface GetRunResult {
  candidates: MealCandidate[];
  context: RecommendationContext;
}

export async function getRecommendationRun(
  runId: string,
  userId: string,
): Promise<GetRunResult | null> {
  // userId is part of the WHERE clause (not just a post-fetch check) because
  // `db` bypasses RLS — see warning in src/db/client.ts.
  const [row] = await db
    .select({
      candidates: recommendation_runs.candidates,
      context_snapshot: recommendation_runs.context_snapshot,
    })
    .from(recommendation_runs)
    .where(and(eq(recommendation_runs.id, runId), eq(recommendation_runs.user_id, userId)))
    .limit(1);

  if (!row) return null;
  return { candidates: row.candidates, context: row.context_snapshot };
}

export interface LatestRunResult {
  runId: string;
  candidates: MealCandidate[];
  context: RecommendationContext;
  createdAt: Date;
}

/**
 * Returns the most recent successful (non-empty candidates) run for a user
 * since `sinceDate` (inclusive). Used to seed /feed-me with cached results
 * so a same-day re-visit renders instantly instead of re-running the engine.
 */
export async function getLatestSuccessfulRun(
  userId: string,
  sinceDate: Date,
): Promise<LatestRunResult | null> {
  const [row] = await db
    .select({
      id: recommendation_runs.id,
      candidates: recommendation_runs.candidates,
      context_snapshot: recommendation_runs.context_snapshot,
      created_at: recommendation_runs.created_at,
    })
    .from(recommendation_runs)
    .where(
      and(
        eq(recommendation_runs.user_id, userId),
        gte(recommendation_runs.created_at, sinceDate),
        sql`jsonb_array_length(${recommendation_runs.candidates}) > 0`,
      ),
    )
    .orderBy(desc(recommendation_runs.created_at))
    .limit(1);

  if (!row) return null;
  return {
    runId: row.id,
    candidates: row.candidates,
    context: row.context_snapshot,
    createdAt: row.created_at,
  };
}
