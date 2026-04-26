import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const signal_snapshots = pgTable(
  'signal_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').notNull(),
    source: text('source').notNull(),
    kind: text('kind').notNull(),
    payload: jsonb('payload').notNull(),
    observed_at: timestamp('observed_at', { withTimezone: true }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userObservedIdx: index('signal_snapshots_user_observed_idx').on(t.user_id, t.observed_at),
  }),
);

export type SignalSnapshotRow = typeof signal_snapshots.$inferSelect;
export type SignalSnapshotInsert = typeof signal_snapshots.$inferInsert;
