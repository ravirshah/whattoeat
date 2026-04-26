import { index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { MealCandidate, RecommendationContext } from '@/contracts/zod';

export const recommendation_runs = pgTable(
  'recommendation_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').notNull(),
    context_snapshot: jsonb('context_snapshot').$type<RecommendationContext>().notNull(),
    candidates: jsonb('candidates').$type<MealCandidate[]>().notNull(),
    model: text('model').notNull(),
    prompts_version: text('prompts_version').notNull(),
    prompt_tokens: integer('prompt_tokens').notNull(),
    completion_tokens: integer('completion_tokens').notNull(),
    latency_ms: integer('latency_ms').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userCreatedIdx: index('recommendation_runs_user_created_idx').on(t.user_id, t.created_at),
  }),
);

export type RecommendationRunRow = typeof recommendation_runs.$inferSelect;
export type RecommendationRunInsert = typeof recommendation_runs.$inferInsert;
