import { sql } from 'drizzle-orm';
import {
  customType,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return 'bytea';
  },
});

export const integrations = pgTable(
  'integrations',
  {
    user_id: uuid('user_id').notNull(),
    provider: text('provider').notNull(),
    status: text('status').notNull().default('connected'),
    credentials: bytea('credentials').notNull(),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
    connected_at: timestamp('connected_at', { withTimezone: true }).notNull().defaultNow(),
    last_synced_at: timestamp('last_synced_at', { withTimezone: true }),
    last_error: text('last_error'),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.user_id, t.provider] }),
    statusIdx: index('integrations_status_idx').on(t.status),
  }),
);

export type IntegrationRow = typeof integrations.$inferSelect;
export type IntegrationInsert = typeof integrations.$inferInsert;
