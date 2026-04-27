import { date, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const weekly_insights = pgTable(
  'weekly_insights',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').notNull(),
    week_start_date: date('week_start_date').notNull(),
    insight_text: text('insight_text').notNull(),
    family: text('family').notNull().$type<'trend' | 'deficit_surplus' | 'variety'>(),
    computed_at: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userWeekUniqueIdx: uniqueIndex('weekly_insights_user_week_unique').on(
      t.user_id,
      t.week_start_date,
    ),
    userWeekIdx: index('weekly_insights_user_week_idx').on(t.user_id, t.week_start_date),
  }),
);

export type WeeklyInsightRow = typeof weekly_insights.$inferSelect;
export type WeeklyInsightInsert = typeof weekly_insights.$inferInsert;
