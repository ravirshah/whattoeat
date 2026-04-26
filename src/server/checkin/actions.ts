'use server';
import { CheckinUpsert } from '@/contracts/zod/checkin';
import { requireUser } from '@/server/auth';
import { checkinRepo } from '@/server/checkin/repo';

/**
 * Return today's check-in for the authenticated user, or null if none exists.
 *
 * @param localDate - The caller's local date as 'YYYY-MM-DD'. If omitted, the
 *   server's UTC date is used, which may differ from the user's local day.
 *   TODO: always pass localDate from the client to avoid timezone drift.
 */
export async function getTodayCheckin(localDate?: string) {
  const { userId } = await requireUser();
  // TODO: server runs UTC; caller should supply localDate to avoid off-by-one
  // for users whose local time is behind UTC late in the day.
  const date = localDate ?? new Date().toISOString().slice(0, 10);
  return checkinRepo.today(userId, date);
}

/**
 * Upsert today's check-in. Validates input against the frozen CheckinUpsert
 * schema before touching the DB. Returns the persisted row.
 */
export async function saveCheckin(input: unknown) {
  const { userId } = await requireUser();
  const parsed = CheckinUpsert.parse(input);
  return checkinRepo.upsert(userId, parsed);
}

/**
 * Return the most recent `days` check-ins for the authenticated user,
 * ordered newest first. Used for the trend display on the check-in page.
 */
export async function listRecentCheckins(days = 7) {
  const { userId } = await requireUser();
  return checkinRepo.recent(userId, days);
}

/**
 * Return all check-ins within [start, end] (ISO date strings, inclusive).
 * Consumed by the engine signal-provider in T8.
 */
export async function getCheckinsForRange(start: string, end: string) {
  const { userId } = await requireUser();
  return checkinRepo.range(userId, start, end);
}
