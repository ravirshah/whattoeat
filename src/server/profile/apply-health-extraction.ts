'use server';

import type { Profile } from '@/contracts/zod/profile';
import { db } from '@/db/client';
import { healthExtractions } from '@/db/schema/health-extractions';
import { requireUser } from '@/server/auth';
import type { ActionResult } from '@/server/contracts';
import { ServerError } from '@/server/contracts';
import { upsertProfile } from '@/server/profile/repo';
import { and, eq } from 'drizzle-orm';

/**
 * Applies the suggested profile changes from a health extraction and marks
 * the extraction as 'applied'. Only touches fields explicitly present in
 * the suggested object — never overwrites fields that were not suggested.
 */
export async function applyHealthExtraction(extractionId: string): Promise<ActionResult<Profile>> {
  const { userId } = await requireUser();

  // Load the extraction — RLS-equivalent check via userId filter.
  const rows = await db
    .select()
    .from(healthExtractions)
    .where(and(eq(healthExtractions.id, extractionId), eq(healthExtractions.user_id, userId)));

  const row = rows[0];
  if (!row) {
    return {
      ok: false,
      error: new ServerError('not_found', 'Extraction not found.'),
    };
  }

  if (row.status === 'applied') {
    return {
      ok: false,
      error: new ServerError('validation_failed', 'This extraction has already been applied.'),
    };
  }

  const suggested = row.suggested as {
    activity_level?: Profile['activity_level'];
    goal?: Profile['goal'];
    targets?: Partial<Profile['targets']>;
    notes?: string[];
  };

  // Build patch from only the fields present in suggested.
  const patch: Parameters<typeof upsertProfile>[1] = {};
  if (suggested.activity_level != null) patch.activity_level = suggested.activity_level;
  if (suggested.goal != null) patch.goal = suggested.goal;
  if (suggested.targets != null) {
    // Merge partial targets — targets must remain a full object in the DB.
    // We fetch current profile only if needed.
    if (
      suggested.targets.kcal != null ||
      suggested.targets.protein_g != null ||
      suggested.targets.carbs_g != null ||
      suggested.targets.fat_g != null
    ) {
      patch.targets = {
        kcal: suggested.targets.kcal ?? 0,
        protein_g: suggested.targets.protein_g ?? 0,
        carbs_g: suggested.targets.carbs_g ?? 0,
        fat_g: suggested.targets.fat_g ?? 0,
      };
    }
  }

  const profile = await upsertProfile(userId, patch);

  // Mark extraction as applied.
  await db
    .update(healthExtractions)
    .set({ status: 'applied' })
    .where(eq(healthExtractions.id, extractionId));

  return { ok: true, value: profile };
}

/**
 * Marks an extraction as discarded without applying anything.
 */
export async function discardHealthExtraction(extractionId: string): Promise<ActionResult<void>> {
  const { userId } = await requireUser();

  const rows = await db
    .select()
    .from(healthExtractions)
    .where(and(eq(healthExtractions.id, extractionId), eq(healthExtractions.user_id, userId)));

  if (!rows[0]) {
    return {
      ok: false,
      error: new ServerError('not_found', 'Extraction not found.'),
    };
  }

  await db
    .update(healthExtractions)
    .set({ status: 'discarded' })
    .where(eq(healthExtractions.id, extractionId));

  return { ok: true, value: undefined };
}
