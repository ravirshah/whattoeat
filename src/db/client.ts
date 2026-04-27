import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Lazy-init so Next.js page-data collection at build time doesn't crash when
// SUPABASE_DB_URL isn't set (CI build with placeholder env, prerender pass).
//
// Cache on globalThis so Next.js dev HMR doesn't leak a fresh `postgres()` pool
// per module-reload. Without this we exhaust the Supabase pooler (pool_size:15)
// after ~5 hot reloads and start seeing EMAXCONNSESSION on every request.

type DbClient = ReturnType<typeof drizzle<typeof schema>>;

interface DbCache {
  pg: ReturnType<typeof postgres> | null;
  db: DbClient | null;
}

const globalForDb = globalThis as unknown as { __wte_db_cache?: DbCache };
const cache: DbCache = globalForDb.__wte_db_cache ?? { pg: null, db: null };
globalForDb.__wte_db_cache = cache;

function getDb(): DbClient {
  if (cache.db) return cache.db;
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error('SUPABASE_DB_URL is not set');
  // max:5 keeps a single Bun/Next process well under the upstream pool_size:15
  // limit even if multiple workers are running. idle_timeout:20 closes
  // unused conns quickly so a long-idle dev session doesn't hold them.
  cache.pg = postgres(url, { prepare: false, max: 5, idle_timeout: 20 });
  cache.db = drizzle(cache.pg, { schema });
  return cache.db;
}

export const db = new Proxy({} as DbClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export type Db = typeof db;
