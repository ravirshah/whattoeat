import {
  date,
  index,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const checkins = pgTable(
  'checkins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').notNull(),
    date: date('date').notNull(),
    energy: smallint('energy').notNull(),
    training: text('training').notNull(),
    hunger: text('hunger').notNull(),
    note: text('note'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userDateIdx: index('checkins_user_date_idx').on(t.user_id, t.date),
    userDateUnique: uniqueIndex('checkins_user_date_unique').on(t.user_id, t.date),
  }),
);

export type CheckinRow = typeof checkins.$inferSelect;
export type CheckinInsert = typeof checkins.$inferInsert;
