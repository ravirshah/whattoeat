import 'server-only';
import type {
  IntegrationProvider,
  IntegrationStatus,
  IntegrationSummary,
} from '@/contracts/zod/integrations';
import { db } from '@/db/client';
import { type IntegrationRow, integrations } from '@/db/schema/integrations';
import { and, eq } from 'drizzle-orm';

function rowToSummary(row: IntegrationRow): IntegrationSummary {
  return {
    provider: row.provider as IntegrationProvider,
    status: row.status as IntegrationStatus,
    connected_at: row.connected_at.toISOString(),
    last_synced_at: row.last_synced_at?.toISOString() ?? null,
    last_error: row.last_error ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

export interface UpsertIntegrationInput {
  user_id: string;
  provider: IntegrationProvider;
  credentials: Buffer;
  metadata: Record<string, unknown>;
}

/**
 * Insert or replace an integration row. Resets status to 'connected' and
 * clears any prior error.
 */
export async function upsertIntegration(
  input: UpsertIntegrationInput,
): Promise<IntegrationSummary> {
  const [row] = await db
    .insert(integrations)
    .values({
      user_id: input.user_id,
      provider: input.provider,
      status: 'connected',
      credentials: input.credentials,
      metadata: input.metadata,
      last_error: null,
    })
    .onConflictDoUpdate({
      target: [integrations.user_id, integrations.provider],
      set: {
        status: 'connected',
        credentials: input.credentials,
        metadata: input.metadata,
        last_error: null,
        connected_at: new Date(),
      },
    })
    .returning();
  if (!row) throw new Error('upsertIntegration returned no row');
  return rowToSummary(row);
}

export async function getIntegrationRow(
  userId: string,
  provider: IntegrationProvider,
): Promise<IntegrationRow | null> {
  const rows = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.user_id, userId), eq(integrations.provider, provider)));
  return rows[0] ?? null;
}

export async function listIntegrationsByUser(userId: string): Promise<IntegrationSummary[]> {
  const rows = await db.select().from(integrations).where(eq(integrations.user_id, userId));
  return rows.map(rowToSummary);
}

export async function listAllConnected(): Promise<IntegrationRow[]> {
  return db.select().from(integrations).where(eq(integrations.status, 'connected'));
}

export async function deleteIntegration(
  userId: string,
  provider: IntegrationProvider,
): Promise<void> {
  await db
    .delete(integrations)
    .where(and(eq(integrations.user_id, userId), eq(integrations.provider, provider)));
}

/**
 * Persist updated credentials (e.g. after a token refresh) without touching
 * other fields.
 */
export async function updateCredentials(
  userId: string,
  provider: IntegrationProvider,
  credentials: Buffer,
): Promise<void> {
  await db
    .update(integrations)
    .set({ credentials })
    .where(and(eq(integrations.user_id, userId), eq(integrations.provider, provider)));
}

export async function markSyncSuccess(
  userId: string,
  provider: IntegrationProvider,
): Promise<void> {
  await db
    .update(integrations)
    .set({ status: 'connected', last_synced_at: new Date(), last_error: null })
    .where(and(eq(integrations.user_id, userId), eq(integrations.provider, provider)));
}

export async function markSyncError(
  userId: string,
  provider: IntegrationProvider,
  error: string,
  status: IntegrationStatus = 'error',
): Promise<void> {
  await db
    .update(integrations)
    .set({ status, last_error: error.slice(0, 500) })
    .where(and(eq(integrations.user_id, userId), eq(integrations.provider, provider)));
}
