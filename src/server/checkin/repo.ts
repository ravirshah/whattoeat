import 'server-only';
import type { CheckinUpsert } from '@/contracts/zod/checkin';
import { db } from '@/db/client';
import { checkins } from '@/db/schema/checkins';
import { and, desc, eq, gte, lte } from 'drizzle-orm';

export const checkinRepo = {
  /** Return today's check-in for userId, or null if none exists. */
  async today(userId: string, date: string) {
    const rows = await db
      .select()
      .from(checkins)
      .where(and(eq(checkins.user_id, userId), eq(checkins.date, date)))
      .limit(1);
    return rows[0] ?? null;
  },

  /** Upsert by (user_id, date). Returns the persisted row. */
  async upsert(userId: string, input: CheckinUpsert) {
    const rows = await db
      .insert(checkins)
      .values({
        user_id: userId,
        date: input.date,
        energy: input.energy,
        training: input.training,
        hunger: input.hunger,
        note: input.note ?? null,
      })
      .onConflictDoUpdate({
        target: [checkins.user_id, checkins.date],
        set: {
          energy: input.energy,
          training: input.training,
          hunger: input.hunger,
          note: input.note ?? null,
        },
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error('checkinRepo.upsert: no row returned');
    return row;
  },

  /** Return the most recent `days` check-ins for userId, ordered newest first. */
  async recent(userId: string, days = 7) {
    return db
      .select()
      .from(checkins)
      .where(eq(checkins.user_id, userId))
      .orderBy(desc(checkins.date))
      .limit(days);
  },

  /** Return all check-ins for userId within [from, to] inclusive. */
  async range(userId: string, from: string, to: string) {
    return db
      .select()
      .from(checkins)
      .where(and(eq(checkins.user_id, userId), gte(checkins.date, from), lte(checkins.date, to)))
      .orderBy(desc(checkins.date));
  },
};
