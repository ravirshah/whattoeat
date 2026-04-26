import { index, pgTable, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const cooked_log = pgTable(
  'cooked_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').notNull(),
    recipe_id: uuid('recipe_id').notNull(),
    cooked_at: timestamp('cooked_at', { withTimezone: true }).notNull().defaultNow(),
    rating: smallint('rating'),
    note: text('note'),
  },
  (t) => ({
    userCookedAtIdx: index('cooked_log_user_cooked_at_idx').on(t.user_id, t.cooked_at),
  }),
);

export type CookedLogRow = typeof cooked_log.$inferSelect;
export type CookedLogInsert = typeof cooked_log.$inferInsert;
