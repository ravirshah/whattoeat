#!/usr/bin/env bun
// Apply hand-written SQL migrations under supabase/migrations/ to the database
// pointed to by $SUPABASE_DB_URL. Tracks applied files in `_wte_applied_migrations`
// so re-runs are idempotent.
//
// Usage:
//   bun run db:migrate           apply all pending
//   bun run db:migrate:status    show applied / pending
//   bun scripts/db-migrate.ts mark <file>   record as applied without running (backfill)
//
// Why a hand-rolled runner instead of `drizzle-kit migrate`?
// drizzle-kit's journal (supabase/migrations/meta/_journal.json) only tracks
// migrations it generated itself. We hand-write SQL for things drizzle can't
// express (RLS policies, idempotent ADD COLUMN IF NOT EXISTS), so they need a
// separate ledger. This runner is that ledger.

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';

const MIGRATIONS_DIR = 'supabase/migrations';
const TRACKING_TABLE = '_wte_applied_migrations';

type Mode = 'apply' | 'status' | 'mark';

function parseArgs(): { mode: Mode; markFile?: string } {
  const arg = process.argv[2];
  if (!arg || arg === 'apply') return { mode: 'apply' };
  if (arg === 'status') return { mode: 'status' };
  if (arg === 'mark') {
    const file = process.argv[3];
    if (!file) {
      console.error('Usage: bun scripts/db-migrate.ts mark <filename>');
      process.exit(1);
    }
    return { mode: 'mark', markFile: file };
  }
  console.error(`Unknown mode: ${arg}. Use apply | status | mark <file>`);
  process.exit(1);
}

function listMigrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

function hashFile(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 16);
}

async function ensureTrackingTable(sql: postgres.Sql) {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS ${TRACKING_TABLE} (
      filename text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function listApplied(sql: postgres.Sql): Promise<Map<string, string>> {
  const rows = await sql.unsafe<{ filename: string; checksum: string }[]>(
    `SELECT filename, checksum FROM ${TRACKING_TABLE} ORDER BY filename`,
  );
  return new Map(rows.map((r) => [r.filename, r.checksum]));
}

async function main() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error('SUPABASE_DB_URL is not set');
    process.exit(1);
  }

  const { mode, markFile } = parseArgs();
  const sql = postgres(url, { prepare: false, max: 1 });

  try {
    await ensureTrackingTable(sql);
    const applied = await listApplied(sql);
    const all = listMigrationFiles();

    if (mode === 'status') {
      console.info('Migrations:');
      for (const f of all) {
        const path = join(MIGRATIONS_DIR, f);
        const expected = hashFile(path);
        const recorded = applied.get(f);
        if (!recorded) {
          console.info(`  pending  ${f}`);
        } else if (recorded !== expected) {
          console.info(`  CHANGED  ${f}  (recorded ${recorded}, file is ${expected})`);
        } else {
          console.info(`  applied  ${f}`);
        }
      }
      return;
    }

    if (mode === 'mark') {
      if (!markFile) {
        console.error('mark mode requires a filename');
        process.exit(1);
      }
      if (!all.includes(markFile)) {
        console.error(`File not found in ${MIGRATIONS_DIR}: ${markFile}`);
        process.exit(1);
      }
      const checksum = hashFile(join(MIGRATIONS_DIR, markFile));
      await sql.unsafe(
        `INSERT INTO ${TRACKING_TABLE} (filename, checksum) VALUES ($1, $2)
         ON CONFLICT (filename) DO UPDATE SET checksum = EXCLUDED.checksum`,
        [markFile, checksum],
      );
      console.info(`Marked ${markFile} as applied (checksum ${checksum})`);
      return;
    }

    // mode === 'apply'
    const pending = all.filter((f) => !applied.has(f));
    if (pending.length === 0) {
      console.info('All migrations applied.');
      return;
    }

    console.info(`Applying ${pending.length} migration(s):`);
    for (const f of pending) {
      const path = join(MIGRATIONS_DIR, f);
      const body = readFileSync(path, 'utf8');
      const checksum = hashFile(path);
      console.info(`  -> ${f}`);
      await sql.begin(async (tx) => {
        await tx.unsafe(body);
        await tx.unsafe(`INSERT INTO ${TRACKING_TABLE} (filename, checksum) VALUES ($1, $2)`, [
          f,
          checksum,
        ]);
      });
      console.info('     ok');
    }
    console.info('Done.');
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
