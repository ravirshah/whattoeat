'use server';
import { CheckinUpsert } from '@/contracts/zod/checkin';
import type { CheckinRow } from '@/db/schema/checkins';
import { requireUser } from '@/server/auth';
import { checkinRepo } from '@/server/checkin/repo';

// Client-safe shape: created_at is ISO string, not Date. Server Components
// can't pass a raw Date through the action boundary to a 'use client' tree.
export type CheckinDTO = Omit<CheckinRow, 'created_at'> & { created_at: string };

function toDTO(row: CheckinRow): CheckinDTO {
  return { ...row, created_at: row.created_at.toISOString() };
}

/**
 * Return today's check-in for the authenticated user, or null if none exists.
 *
 * @param localDate - The caller's local date as 'YYYY-MM-DD'. If omitted, the
 *   server's UTC date is used, which may differ from the user's local day.
 *   TODO: always pass localDate from the client to avoid timezone drift.
 */
export async function getTodayCheckin(localDate?: string): Promise<CheckinDTO | null> {
  const { userId } = await requireUser();
  // TODO: server runs UTC; caller should supply localDate to avoid off-by-one
  // for users whose local time is behind UTC late in the day.
  const date = localDate ?? new Date().toISOString().slice(0, 10);
  const row = await checkinRepo.today(userId, date);
  return row ? toDTO(row) : null;
}

/**
 * Upsert today's check-in. Validates input against the frozen CheckinUpsert
 * schema before touching the DB. Rejects non-today dates so a stale or
 * replayed form cannot overwrite a historical day. Returns the persisted row.
 */
export async function saveCheckin(input: unknown): Promise<CheckinDTO> {
  const { userId } = await requireUser();
  const parsed = CheckinUpsert.parse(input);
  const today = new Date().toISOString().slice(0, 10);
  if (parsed.date !== today) {
    throw new Error(`saveCheckin: date must be today (${today}), got ${parsed.date}`);
  }
  const row = await checkinRepo.upsert(userId, parsed);
  return toDTO(row);
}

/**
 * Return the most recent `days` check-ins for the authenticated user,
 * ordered newest first. Used for the trend display on the check-in page.
 */
export async function listRecentCheckins(days = 7): Promise<CheckinDTO[]> {
  const { userId } = await requireUser();
  const rows = await checkinRepo.recent(userId, days);
  return rows.map(toDTO);
}

/**
 * Return all check-ins within [start, end] (ISO date strings, inclusive).
 * Consumed by the engine signal-provider in T8.
 */
export async function getCheckinsForRange(start: string, end: string): Promise<CheckinDTO[]> {
  const { userId } = await requireUser();
  const rows = await checkinRepo.range(userId, start, end);
  return rows.map(toDTO);
}
