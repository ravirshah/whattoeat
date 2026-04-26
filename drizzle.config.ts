import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './supabase/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.SUPABASE_DB_URL ?? '',
  },
  verbose: true,
  strict: true,
});
