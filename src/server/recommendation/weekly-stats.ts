import 'server-only';

import type { MealCandidate } from '@/contracts/zod/recommendation';
import { db } from '@/db/client';
import { recommendation_runs } from '@/db/schema/recommendation-runs';
import type { WeeklyStats } from '@/engine/prompt';
import { and, eq, gte } from 'drizzle-orm';

// Re-export so callers outside the engine layer can use the type from here.
export type { WeeklyStats } from '@/engine/prompt';

// Common protein ingredient keywords for extraction
const PROTEIN_KEYWORDS = [
  'chicken',
  'beef',
  'pork',
  'fish',
  'salmon',
  'tuna',
  'shrimp',
  'tofu',
  'tempeh',
  'eggs',
  'egg',
  'turkey',
  'lamb',
  'cod',
  'tilapia',
  'lentils',
  'chickpeas',
  'beans',
  'seitan',
  'edamame',
];

function extractProtein(candidate: MealCandidate): string | null {
  // Check ingredient names for known proteins
  for (const ingredient of candidate.ingredients) {
    const name = ingredient.name.toLowerCase();
    for (const keyword of PROTEIN_KEYWORDS) {
      if (name.includes(keyword)) return keyword;
    }
  }
  // Fall back to checking tags
  for (const tag of candidate.tags ?? []) {
    const t = tag.toLowerCase();
    for (const keyword of PROTEIN_KEYWORDS) {
      if (t.includes(keyword)) return keyword;
    }
  }
  return null;
}

function mode<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  const counts = new Map<T, number>();
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  let best: T | null = null;
  let bestCount = 0;
  for (const [item, count] of counts) {
    if (count > bestCount) {
      best = item;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Compute weekly nutrition stats for the given user from the last 7 days of
 * recommendation_runs. Returns null when fewer than 3 distinct days have data
 * (graceful degradation gate).
 *
 * Uses the Drizzle service-role client (db) to read recommendation_runs.
 * Callers must verify the userId comes from a trusted source (requireUser).
 */
export async function computeWeeklyStats(userId: string): Promise<WeeklyStats | null> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoIso = sevenDaysAgo.toISOString();

  const rows = await db
    .select()
    .from(recommendation_runs)
    .where(
      and(
        eq(recommendation_runs.user_id, userId),
        gte(recommendation_runs.created_at, new Date(sevenDaysAgoIso)),
      ),
    )
    .orderBy(recommendation_runs.created_at);

  // Filter to successful runs (candidates array has at least one item)
  const successfulRows = rows.filter((r) => Array.isArray(r.candidates) && r.candidates.length > 0);

  if (successfulRows.length === 0) return null;

  // Pick top candidate (index 0) as proxy for "what they cooked"
  const topCandidates: MealCandidate[] = successfulRows
    .map((r) => (r.candidates as MealCandidate[])[0])
    .filter((c): c is MealCandidate => c !== undefined);

  // Count distinct calendar days
  const distinctDaySet = new Set(
    successfulRows.map((r) => r.created_at.toISOString().slice(0, 10)),
  );
  const distinctDays = distinctDaySet.size;

  // Graceful degradation: require at least 3 distinct days
  if (distinctDays < 3) return null;

  const runCount = topCandidates.length;

  // Macro means
  const meanKcal = Math.round(
    topCandidates.reduce((s, c) => s + (c.estMacros.kcal ?? 0), 0) / runCount,
  );
  const meanProtein = Math.round(
    topCandidates.reduce((s, c) => s + (c.estMacros.protein_g ?? 0), 0) / runCount,
  );
  const meanCarbs = Math.round(
    topCandidates.reduce((s, c) => s + (c.estMacros.carbs_g ?? 0), 0) / runCount,
  );
  const meanFat = Math.round(
    topCandidates.reduce((s, c) => s + (c.estMacros.fat_g ?? 0), 0) / runCount,
  );

  // Top cuisine (mode of non-null cuisine values)
  const cuisines = topCandidates.map((c) => c.cuisine).filter((c): c is string => c !== null);
  const topCuisine = mode(cuisines);

  // Protein analysis
  const proteinPerRun = topCandidates.map(extractProtein).filter((p): p is string => p !== null);
  const distinctProteins = [...new Set(proteinPerRun)];
  const repeatedProteinName = mode(proteinPerRun);
  const repeatedProteinCount = repeatedProteinName
    ? proteinPerRun.filter((p) => p === repeatedProteinName).length
    : 0;

  return {
    runCount,
    distinctDays,
    meanKcal,
    meanProtein,
    meanCarbs,
    meanFat,
    topCuisine,
    distinctProteins,
    repeatedProteinCount,
    repeatedProteinName,
  };
}
