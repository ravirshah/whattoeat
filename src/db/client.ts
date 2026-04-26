import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  throw new Error('SUPABASE_DB_URL is not set');
}

const queryClient = postgres(url, { prepare: false });
export const db = drizzle(queryClient, { schema });
export type Db = typeof db;
