import 'server-only';

import type { Profile } from '@/contracts/zod/profile';
import { db } from '@/db/client';
import { weekly_insights } from '@/db/schema/weekly-insights';
import type { LlmClient } from '@/engine/ports/llm';
import { and, eq } from 'drizzle-orm';
import { type WeeklyInsightValue, generateWeeklyInsight } from './weekly-insight';
import { computeWeeklyStats } from './weekly-stats';

/**
 * Returns the ISO date string for the Monday of the week containing `date`.
 * Week starts on Monday so the "weekly" cache key is stable across the week.
 */
export function getWeekStartDate(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sunday, 1=Monday, ...
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

/**
 * Returns today's weekly insight for the given user, computing and persisting
 * a new one if none exists for the current week.
 *
 * Gate logic:
 * - If a row already exists for (user_id, week_start_date), return it — no LLM call.
 * - Otherwise compute stats; if <3 distinct days → return null.
 * - Otherwise call the LLM, persist the result, and return it.
 *
 * All errors are swallowed and null is returned — callers should render without
 * the insight rather than failing the page.
 */
export async function getOrComputeForWeek(
  userId: string,
  profile: Profile,
  weekStartDate?: string,
  llmOverride?: LlmClient,
): Promise<WeeklyInsightValue | null> {
  const weekStart = weekStartDate ?? getWeekStartDate(new Date());

  try {
    // 1. Check cache (existing row for this week)
    const existing = await db
      .select()
      .from(weekly_insights)
      .where(
        and(eq(weekly_insights.user_id, userId), eq(weekly_insights.week_start_date, weekStart)),
      )
      .limit(1);

    if (existing.length > 0 && existing[0]) {
      const row = existing[0];
      return {
        insight: row.insight_text,
        family: row.family as WeeklyInsightValue['family'],
      };
    }

    // 2. Compute stats
    const stats = await computeWeeklyStats(userId);
    if (!stats) return null; // < 3 days of data

    // 3. Generate insight via LLM (with fallback built into generateWeeklyInsight)
    const result = await generateWeeklyInsight(stats, profile, llmOverride);
    if (!result.ok) return null;

    const { insight, family } = result.value;

    // 4. Persist — upsert in case of concurrent writes
    await db
      .insert(weekly_insights)
      .values({
        user_id: userId,
        week_start_date: weekStart,
        insight_text: insight,
        family,
      })
      .onConflictDoUpdate({
        target: [weekly_insights.user_id, weekly_insights.week_start_date],
        set: {
          insight_text: insight,
          family,
          computed_at: new Date(),
        },
      });

    return { insight, family };
  } catch {
    // Swallow all errors — a missing insight must never break the home page.
    return null;
  }
}
