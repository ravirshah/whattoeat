import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Lazy-init so Next.js page-data collection at build time doesn't crash when
// SUPABASE_DB_URL isn't set (CI build with placeholder env, prerender pass).
// Real callers in Server Actions / route handlers run at request time and the
// var must be set then — the error fires the moment a query is attempted.

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getDb() {
  if (_db) return _db;
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error('SUPABASE_DB_URL is not set');
  const queryClient = postgres(url, { prepare: false });
  _db = drizzle(queryClient, { schema });
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export type Db = typeof db;
