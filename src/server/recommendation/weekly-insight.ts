import 'server-only';

import type { Profile } from '@/contracts/zod/profile';
import type { LlmClient } from '@/engine/ports/llm';
import { WeeklyInsightResponseSchema, buildWeeklyInsightPrompt } from '@/engine/prompt';
import { resolveClient } from '@/lib/feed-me/resolveClient';
import type { ActionResult } from '@/server/contracts';
import type { WeeklyStats } from './weekly-stats';

export type InsightFamily = 'trend' | 'deficit_surplus' | 'variety';

export interface WeeklyInsightValue {
  insight: string;
  family: InsightFamily;
}

/**
 * Calls the LLM to generate a one-sentence weekly nutrition insight based on
 * deterministically computed stats. The LLM writes the sentence; the numbers
 * come from the caller-provided stats (server-computed, never hallucinated).
 *
 * Falls back gracefully to a deterministic template string if the LLM call
 * fails — the fallback contains no LLM-flavour copy.
 */
export async function generateWeeklyInsight(
  stats: WeeklyStats,
  profile: Profile,
  llmOverride?: LlmClient,
): Promise<ActionResult<WeeklyInsightValue>> {
  const llm = llmOverride ?? resolveClient();
  const { system, user } = buildWeeklyInsightPrompt(stats, profile);

  try {
    const result = await llm.generateStructured({
      system,
      user,
      schema: WeeklyInsightResponseSchema,
      modelHint: 'cheap',
      timeoutMs: 10_000,
    });

    return {
      ok: true,
      value: {
        insight: result.value.insight,
        family: result.value.family,
      },
    };
  } catch {
    // Deterministic fallback — no LLM copy, plain stat string.
    const fallbackInsight = `You've logged ${stats.runCount} meals this week — averaging ${stats.meanKcal}kcal.`;

    return {
      ok: true,
      value: {
        insight: fallbackInsight.slice(0, 150),
        family: 'trend',
      },
    };
  }
}
