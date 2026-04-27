import type { HealthMarker, HealthSuggested } from '@/contracts/zod/health';
import { sql } from 'drizzle-orm';
import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const healthExtractions = pgTable('health_extractions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid('user_id').notNull(),
  doc_type: text('doc_type').notNull(),
  markers: jsonb('markers').$type<HealthMarker[]>().notNull().default(sql`'[]'::jsonb`),
  suggested: jsonb('suggested').$type<HealthSuggested>().notNull().default(sql`'{}'::jsonb`),
  summary: text('summary').notNull(),
  /** 'pending' → shown in UI; 'applied' → profile updated; 'discarded' → dismissed */
  status: text('status').notNull().default('pending'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type HealthExtractionRow = typeof healthExtractions.$inferSelect;
export type HealthExtractionInsert = typeof healthExtractions.$inferInsert;
