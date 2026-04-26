import { sql } from 'drizzle-orm';
import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const pantry_items = pgTable(
  'pantry_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').notNull(),
    name: text('name').notNull(),
    display_name: text('display_name').notNull(),
    category: text('category').notNull(),
    available: boolean('available').notNull().default(true),
    added_at: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userAvailableIdx: index('pantry_items_user_available_idx').on(t.user_id, t.available),
    userNameUnique: uniqueIndex('pantry_items_user_name_unique').on(t.user_id, sql`lower(${t.name})`),
  }),
);

export type PantryItemRow = typeof pantry_items.$inferSelect;
export type PantryItemInsert = typeof pantry_items.$inferInsert;
