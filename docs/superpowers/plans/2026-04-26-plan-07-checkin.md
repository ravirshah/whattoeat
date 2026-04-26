# Plan 07 — Check-in Feature

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the daily check-in feature end-to-end — a Drizzle repo, four server actions (today / save / recent / range), a full-page check-in form, an existing-check-in summary with edit affordance, and a complete test suite. After this track merges, T8 ("Feed Me") can pass `getTodayCheckin()` output directly into `RecommendationContext.checkin`.

**Architecture:** Three layers owned by this track. (1) `src/server/checkin/repo.ts` — raw Drizzle queries, no auth logic. (2) `src/server/checkin/actions.ts` — Server Actions that call `requireUser()`, validate input via the frozen `CheckinUpsert` Zod schema, and delegate to the repo. (3) `src/app/checkin/page.tsx` + `src/components/feature/checkin/` — the UI. The `CheckinSheet` stub in Track 1 is replaced by the fully wired `CheckinForm` component; the sheet wrapper (`CheckinSheet`) is augmented to call the real server action.

**Tech stack:** Drizzle ORM, `@supabase/ssr`, Zod (contracts frozen by T0), Vitest, Next.js 15 App Router, React 19. No new runtime dependencies required.

**Spec reference:** `docs/superpowers/specs/2026-04-26-whattoeat-2.0-design.md` — sections 2 (architecture), 3 (data model / `checkins` table), 5 (design system), 7 (daily check-in flow).

**Prerequisites (verified before Task 1):**
- Track 0 merged to `main`: `src/contracts/zod/checkin.ts` exports `Checkin`, `CheckinUpsert`, `TrainingLevel`, `HungerLevel`; `src/db/schema/checkins.ts` defines the Drizzle table; RLS enforces `auth.uid() = user_id`.
- Track 1 merged to `main`: `SegmentedControl`, `Button`, `Label`, `Input`, `Sheet`/`SheetContent`/`SheetHeader`/`SheetTitle`/`SheetDescription`, `CheckinSheet` stub — all in `src/components/ui/`.
- Track 4 merged to `main`: `requireUser()` exported from `src/server/auth/`.
- Branch `wt/track-7-checkin` is checked out from a fresh `main`.
- `bun run typecheck` exits 0 on `main`.

---

## File Structure

### Creates

```
src/server/checkin/repo.ts
src/server/checkin/actions.ts
src/server/checkin/index.ts

src/server/checkin/__tests__/repo.test.ts
src/server/checkin/__tests__/actions.test.ts
src/server/checkin/__tests__/e2e-style.test.ts

src/components/feature/checkin/CheckinForm.tsx
src/components/feature/checkin/CheckinSummary.tsx
src/components/feature/checkin/EnergySlider.tsx
src/components/feature/checkin/index.ts

src/app/checkin/page.tsx
```

### Modifies

```
src/components/ui/checkin-sheet.tsx   — wires real server action + CheckinForm (Track 1 stub, owned by T7 to fill in)
```

### Does NOT touch (frozen or owned by other tracks)

```
src/contracts/**
src/db/**
supabase/**
src/engine/**
src/server/auth/**          (import only)
src/components/ui/**        (import only; exception: checkin-sheet.tsx stub per T1 agreement)
tailwind.config.ts
.github/workflows/**
```

---

## Conventions used in this plan

- All file paths are repo-relative; absolute paths in bash commands use `/Users/ravishah/Documents/whattoeat`.
- `bun` is the package manager and test runner (`bun run test`, `bun run typecheck`).
- Imports use the `@/` alias for `src/` (e.g. `@/server/checkin`, `@/contracts/zod/checkin`).
- Commit message prefixes:
  - `checkin:` — source files in `src/server/checkin/` and `src/components/feature/checkin/`
  - `checkin-test:` — files under `src/server/checkin/__tests__/`
  - `checkin-ui:` — files in `src/app/checkin/` and modifications to `src/components/ui/checkin-sheet.tsx`
- **TDD discipline:** test files are written first (expected RED), implementation makes them GREEN. Steps are annotated `— expected RED` or `— expected GREEN`.
- **No client-supplied user IDs:** every server action sources `userId` from `requireUser()`, never from request bodies.
- **Upsert key:** `(user_id, date)` — the unique constraint enforced at the DB level and mirrored in Drizzle's `onConflictDoUpdate`.
- **`training` values:** the spec's data model says `none | light | hard`. The `CheckinUpsert` Zod schema (frozen) uses exactly these values. The UI labels map: `none → "Rest"`, `light → "Light"`, `hard → "Hard"`.

<!-- TODO: confirm with user — The spec data model (section 3) lists training as `none | light | hard`, but the Zod contract lists `none | light | moderate | hard`. Plan uses the Zod contract as the single source of truth; update data-model section of spec if confirmed. -->

<!-- TODO: confirm with user — Timezone handling: `getTodayCheckin()` derives today's date using `new Date().toISOString().slice(0, 10)` (UTC). If the user is behind UTC (e.g. UTC-8 at 11pm), "today" on the server is already "tomorrow". The correct fix is to pass the client's local date as a parameter. For now the action accepts an optional `localDate?: string` parameter and falls back to the UTC date; the TODO is marked in the code. T8 should pass `localDate` from the client. -->

<!-- TODO: confirm with user — Can users edit a check-in from a previous day? The current implementation only allows editing today's check-in (the page redirects to `/feed-me` for any date that is not today). Confirm whether `/checkin?date=YYYY-MM-DD` editing should be supported. -->

---

## Tasks

### Task 1: Baseline verification

**Files:** `package.json` (read-only verify)

Confirm prerequisites exist before writing any code. No files are created in this task.

- [ ] **Step 1: Verify contracts**

```bash
cd /Users/ravishah/Documents/whattoeat && grep -E 'CheckinUpsert|TrainingLevel|HungerLevel' src/contracts/zod/checkin.ts
```

Expected: all three names appear. If the file is missing, stop — Track 0 must merge first.

- [ ] **Step 2: Verify Drizzle schema**

```bash
cd /Users/ravishah/Documents/whattoeat && ls src/db/schema/checkins.ts
```

Expected: file exists. If missing, stop.

- [ ] **Step 3: Verify `requireUser` export**

```bash
cd /Users/ravishah/Documents/whattoeat && grep 'requireUser' src/server/auth/index.ts
```

Expected: export line present.

- [ ] **Step 4: Verify UI primitives**

```bash
cd /Users/ravishah/Documents/whattoeat && ls src/components/ui/segmented-control.tsx src/components/ui/button.tsx src/components/ui/sheet.tsx src/components/ui/label.tsx
```

Expected: all four files exist.

- [ ] **Step 5: Typecheck baseline**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

Expected: exit 0.

- [ ] **Step 6: Commit**

No files changed in this task — skip the commit.

---

### Task 2: Write failing repo tests — expected RED

**Files:** `src/server/checkin/__tests__/repo.test.ts`

Write all repo tests first. They test `today()`, `upsert()`, `recent()`, and `range()` against a mocked Drizzle client. All tests will fail until Task 3 implements the repo.

- [ ] **Step 1: Write `src/server/checkin/__tests__/repo.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CheckinUpsert } from '@/contracts/zod/checkin';

// ---------------------------------------------------------------------------
// Mock Drizzle and the DB module before importing the repo.
// ---------------------------------------------------------------------------
const mockSelect = vi.fn();
const mockInsert = vi.fn();

vi.mock('@/db', () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
  },
}));

vi.mock('@/db/schema/checkins', () => ({
  checkins: {
    user_id: 'user_id',
    date: 'date',
    energy: 'energy',
    training: 'training',
    hunger: 'hunger',
    note: 'note',
    id: 'id',
    created_at: 'created_at',
  },
}));

// Import after mocks are in place.
import { checkinRepo } from '@/server/checkin/repo';

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------
const USER_ID = 'user-abc-123';
const TODAY = '2026-04-26';
const BASE_ROW = {
  id: 'row-1',
  user_id: USER_ID,
  date: TODAY,
  energy: 3,
  training: 'light' as const,
  hunger: 'normal' as const,
  note: null,
  created_at: '2026-04-26T10:00:00.000Z',
};
const UPSERT_INPUT: CheckinUpsert = {
  date: TODAY,
  energy: 3,
  training: 'light',
  hunger: 'normal',
};

// ---------------------------------------------------------------------------
// Helpers to build fluent Drizzle query chain mocks
// ---------------------------------------------------------------------------
function makeSelectChain(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
    orderBy: vi.fn().mockReturnThis(),
  };
  mockSelect.mockReturnValue(chain);
  return chain;
}

function makeInsertChain(returned: unknown[]) {
  const chain = {
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(returned),
  };
  mockInsert.mockReturnValue(chain);
  return chain;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('checkinRepo.today', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a check-in row when one exists for the given date', async () => {
    makeSelectChain([BASE_ROW]);
    const result = await checkinRepo.today(USER_ID, TODAY);
    expect(result).toEqual(BASE_ROW);
  });

  it('returns null when no check-in exists for the given date', async () => {
    makeSelectChain([]);
    const result = await checkinRepo.today(USER_ID, TODAY);
    expect(result).toBeNull();
  });
});

describe('checkinRepo.upsert', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the upserted row', async () => {
    const updated = { ...BASE_ROW, energy: 5 };
    makeInsertChain([updated]);
    const result = await checkinRepo.upsert(USER_ID, { ...UPSERT_INPUT, energy: 5 });
    expect(result).toEqual(updated);
    expect(mockInsert).toHaveBeenCalledOnce();
  });

  it('passes user_id from the argument, not from the input object', async () => {
    makeInsertChain([BASE_ROW]);
    await checkinRepo.upsert('explicit-user-id', UPSERT_INPUT);
    // The values() call should include user_id: 'explicit-user-id'
    const chain = mockInsert.mock.results[0]?.value as { values: ReturnType<typeof vi.fn> };
    const valuesArg = chain.values.mock.calls[0]?.[0] as { user_id: string };
    expect(valuesArg?.user_id).toBe('explicit-user-id');
  });
});

describe('checkinRepo.recent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns rows ordered by date desc', async () => {
    const rows = [BASE_ROW, { ...BASE_ROW, date: '2026-04-25', id: 'row-2' }];
    makeSelectChain(rows);
    const result = await checkinRepo.recent(USER_ID, 7);
    expect(result).toHaveLength(2);
    expect(result[0]?.date).toBe(TODAY);
  });

  it('defaults to 7 days when no argument given', async () => {
    makeSelectChain([BASE_ROW]);
    await checkinRepo.recent(USER_ID);
    expect(mockSelect).toHaveBeenCalledOnce();
  });
});

describe('checkinRepo.range', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns rows within the given date range', async () => {
    makeSelectChain([BASE_ROW]);
    const result = await checkinRepo.range(USER_ID, '2026-04-20', '2026-04-26');
    expect(result).toHaveLength(1);
    expect(result[0]?.date).toBe(TODAY);
  });

  it('returns empty array when no rows match', async () => {
    makeSelectChain([]);
    const result = await checkinRepo.range(USER_ID, '2026-01-01', '2026-01-07');
    expect(result).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests — expected RED**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/server/checkin/__tests__/repo.test.ts
```

Expected: tests fail because `src/server/checkin/repo.ts` does not exist yet.

- [ ] **Step 3: Commit**

```bash
git add src/server/checkin/__tests__/repo.test.ts
git commit -m "checkin-test: failing repo unit tests"
```

---

### Task 3: Implement the repo — expected GREEN

**Files:** `src/server/checkin/repo.ts`

Drizzle queries with no auth logic. The repo is a plain object (`checkinRepo`) exported for easy mocking in action tests.

- [ ] **Step 1: Write `src/server/checkin/repo.ts`**

```ts
import 'server-only';
import { and, desc, gte, lte, eq } from 'drizzle-orm';
import { db } from '@/db';
import { checkins } from '@/db/schema/checkins';
import type { CheckinUpsert } from '@/contracts/zod/checkin';

export const checkinRepo = {
  /** Return today's check-in for userId, or null if none exists. */
  async today(userId: string, date: string) {
    const rows = await db
      .select()
      .from(checkins)
      .where(and(eq(checkins.user_id, userId), eq(checkins.date, date)))
      .limit(1);
    return rows[0] ?? null;
  },

  /** Upsert by (user_id, date). Returns the persisted row. */
  async upsert(userId: string, input: CheckinUpsert) {
    const rows = await db
      .insert(checkins)
      .values({
        user_id: userId,
        date: input.date,
        energy: input.energy,
        training: input.training,
        hunger: input.hunger,
        note: input.note ?? null,
      })
      .onConflictDoUpdate({
        target: [checkins.user_id, checkins.date],
        set: {
          energy: input.energy,
          training: input.training,
          hunger: input.hunger,
          note: input.note ?? null,
        },
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error('checkinRepo.upsert: no row returned');
    return row;
  },

  /** Return the most recent `days` check-ins for userId, ordered newest first. */
  async recent(userId: string, days = 7) {
    return db
      .select()
      .from(checkins)
      .where(eq(checkins.user_id, userId))
      .orderBy(desc(checkins.date))
      .limit(days);
  },

  /** Return all check-ins for userId within [from, to] inclusive. */
  async range(userId: string, from: string, to: string) {
    return db
      .select()
      .from(checkins)
      .where(
        and(
          eq(checkins.user_id, userId),
          gte(checkins.date, from),
          lte(checkins.date, to),
        ),
      )
      .orderBy(desc(checkins.date));
  },
};
```

- [ ] **Step 2: Run repo tests — expected GREEN**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/server/checkin/__tests__/repo.test.ts
```

Expected: all tests pass.

- [ ] **Step 3: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/server/checkin/repo.ts
git commit -m "checkin: Drizzle repo (today / upsert / recent / range)"
```

---

### Task 4: Write failing action tests — expected RED

**Files:** `src/server/checkin/__tests__/actions.test.ts`

Tests for all four Server Actions. Auth is mocked; the repo is mocked. Asserts that `userId` is always sourced from `requireUser()`, never from caller-supplied data.

- [ ] **Step 1: Write `src/server/checkin/__tests__/actions.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock auth helper — must come before importing actions.
// ---------------------------------------------------------------------------
vi.mock('@/server/auth', () => ({
  requireUser: vi.fn(),
}));

// Mock the repo so we don't touch the DB.
vi.mock('@/server/checkin/repo', () => ({
  checkinRepo: {
    today: vi.fn(),
    upsert: vi.fn(),
    recent: vi.fn(),
    range: vi.fn(),
  },
}));

// next/headers is not available in vitest — mock it.
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })),
}));

import { requireUser } from '@/server/auth';
import { checkinRepo } from '@/server/checkin/repo';
import {
  getTodayCheckin,
  saveCheckin,
  listRecentCheckins,
  getCheckinsForRange,
} from '@/server/checkin/actions';

const mockRequireUser = vi.mocked(requireUser);
const mockRepo = vi.mocked(checkinRepo);

const FAKE_USER = { userId: 'user-xyz', email: 'ravi@example.com' };
const TODAY = '2026-04-26';
const BASE_ROW = {
  id: 'row-1',
  user_id: 'user-xyz',
  date: TODAY,
  energy: 3,
  training: 'light' as const,
  hunger: 'normal' as const,
  note: null,
  created_at: '2026-04-26T10:00:00.000Z',
};

describe('getTodayCheckin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns today's check-in when one exists', async () => {
    mockRequireUser.mockResolvedValue(FAKE_USER);
    mockRepo.today.mockResolvedValue(BASE_ROW);
    const result = await getTodayCheckin();
    expect(result).toEqual(BASE_ROW);
    expect(mockRepo.today).toHaveBeenCalledWith('user-xyz', expect.any(String));
  });

  it('returns null when no check-in exists', async () => {
    mockRequireUser.mockResolvedValue(FAKE_USER);
    mockRepo.today.mockResolvedValue(null);
    const result = await getTodayCheckin();
    expect(result).toBeNull();
  });

  it('always uses userId from requireUser, not a caller argument', async () => {
    mockRequireUser.mockResolvedValue({ userId: 'server-user', email: 'x@x.com' });
    mockRepo.today.mockResolvedValue(null);
    await getTodayCheckin();
    expect(mockRepo.today).toHaveBeenCalledWith('server-user', expect.any(String));
  });
});

describe('saveCheckin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls repo.upsert with the userId from requireUser', async () => {
    mockRequireUser.mockResolvedValue(FAKE_USER);
    mockRepo.upsert.mockResolvedValue(BASE_ROW);
    const input = { date: TODAY, energy: 4, training: 'hard' as const, hunger: 'high' as const };
    await saveCheckin(input);
    expect(mockRepo.upsert).toHaveBeenCalledWith('user-xyz', input);
  });

  it('returns the upserted row', async () => {
    mockRequireUser.mockResolvedValue(FAKE_USER);
    const updated = { ...BASE_ROW, energy: 5 };
    mockRepo.upsert.mockResolvedValue(updated);
    const result = await saveCheckin({ date: TODAY, energy: 5, training: 'light', hunger: 'normal' });
    expect(result.energy).toBe(5);
  });

  it('throws a validation error if energy is out of range', async () => {
    mockRequireUser.mockResolvedValue(FAKE_USER);
    await expect(
      // @ts-expect-error — deliberately invalid
      saveCheckin({ date: TODAY, energy: 99, training: 'light', hunger: 'normal' }),
    ).rejects.toThrow();
    expect(mockRepo.upsert).not.toHaveBeenCalled();
  });
});

describe('listRecentCheckins', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes userId from requireUser to repo.recent', async () => {
    mockRequireUser.mockResolvedValue(FAKE_USER);
    mockRepo.recent.mockResolvedValue([BASE_ROW]);
    await listRecentCheckins(7);
    expect(mockRepo.recent).toHaveBeenCalledWith('user-xyz', 7);
  });

  it('defaults to 7 days', async () => {
    mockRequireUser.mockResolvedValue(FAKE_USER);
    mockRepo.recent.mockResolvedValue([BASE_ROW]);
    await listRecentCheckins();
    expect(mockRepo.recent).toHaveBeenCalledWith('user-xyz', 7);
  });
});

describe('getCheckinsForRange', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates to repo.range with userId from requireUser', async () => {
    mockRequireUser.mockResolvedValue(FAKE_USER);
    mockRepo.range.mockResolvedValue([BASE_ROW]);
    const result = await getCheckinsForRange('2026-04-20', '2026-04-26');
    expect(mockRepo.range).toHaveBeenCalledWith('user-xyz', '2026-04-20', '2026-04-26');
    expect(result).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests — expected RED**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/server/checkin/__tests__/actions.test.ts
```

Expected: tests fail because `src/server/checkin/actions.ts` does not exist yet.

- [ ] **Step 3: Commit**

```bash
git add src/server/checkin/__tests__/actions.test.ts
git commit -m "checkin-test: failing action unit tests"
```

---

### Task 5: Implement server actions — expected GREEN

**Files:** `src/server/checkin/actions.ts`, `src/server/checkin/index.ts`

Four `'use server'` actions. Input is validated via the frozen `CheckinUpsert` schema before any DB call.

<!-- TODO: confirm with user — `getTodayCheckin` currently accepts an optional `localDate` parameter and falls back to `new Date().toISOString().slice(0, 10)` (UTC day) when not supplied. T8 (Feed Me) should pass the client's local date string. -->

- [ ] **Step 1: Write `src/server/checkin/actions.ts`**

```ts
'use server';
import { requireUser } from '@/server/auth';
import { CheckinUpsert } from '@/contracts/zod/checkin';
import { checkinRepo } from '@/server/checkin/repo';

/**
 * Return today's check-in for the authenticated user, or null if none exists.
 *
 * @param localDate - The caller's local date as 'YYYY-MM-DD'. If omitted, the
 *   server's UTC date is used, which may differ from the user's local day.
 *   TODO: always pass localDate from the client to avoid timezone drift.
 */
export async function getTodayCheckin(localDate?: string) {
  const { userId } = await requireUser();
  // TODO: server runs UTC; caller should supply localDate to avoid off-by-one
  // for users whose local time is behind UTC late in the day.
  const date = localDate ?? new Date().toISOString().slice(0, 10);
  return checkinRepo.today(userId, date);
}

/**
 * Upsert today's check-in. Validates input against the frozen CheckinUpsert
 * schema before touching the DB. Returns the persisted row.
 */
export async function saveCheckin(input: unknown) {
  const { userId } = await requireUser();
  const parsed = CheckinUpsert.parse(input);
  return checkinRepo.upsert(userId, parsed);
}

/**
 * Return the most recent `days` check-ins for the authenticated user,
 * ordered newest first. Used for the trend display on the check-in page.
 */
export async function listRecentCheckins(days = 7) {
  const { userId } = await requireUser();
  return checkinRepo.recent(userId, days);
}

/**
 * Return all check-ins within [start, end] (ISO date strings, inclusive).
 * Consumed by the engine signal-provider in T8.
 */
export async function getCheckinsForRange(start: string, end: string) {
  const { userId } = await requireUser();
  return checkinRepo.range(userId, start, end);
}
```

- [ ] **Step 2: Write `src/server/checkin/index.ts`**

```ts
export {
  getTodayCheckin,
  saveCheckin,
  listRecentCheckins,
  getCheckinsForRange,
} from './actions';
export { checkinRepo } from './repo';
```

- [ ] **Step 3: Run action tests — expected GREEN**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/server/checkin/__tests__/actions.test.ts
```

Expected: all tests pass.

- [ ] **Step 4: Run repo tests still GREEN**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/server/checkin/__tests__/
```

Expected: all tests in the directory pass.

- [ ] **Step 5: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/server/checkin/actions.ts src/server/checkin/index.ts
git commit -m "checkin: server actions (getTodayCheckin / saveCheckin / listRecentCheckins / getCheckinsForRange)"
```

---

### Task 6: End-to-end-style in-memory test — expected RED then GREEN

**Files:** `src/server/checkin/__tests__/e2e-style.test.ts`

A single self-contained test that wires an in-memory store (a `Map`) through thin action-shaped functions. No real DB, no real auth — but the full save → read-back → upsert-dedup flow is covered.

- [ ] **Step 1: Write `src/server/checkin/__tests__/e2e-style.test.ts`**

```ts
/**
 * End-to-end-style test: save → getToday returns it → save again same date
 * → upsert (single row, latest values).
 *
 * Uses a thin in-memory store that mirrors the repo contract so the test
 * exercises the full action logic without a DB or network.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CheckinUpsert } from '@/contracts/zod/checkin';

// ---------------------------------------------------------------------------
// In-memory store that mirrors checkinRepo's contract.
// ---------------------------------------------------------------------------
type Row = {
  id: string;
  user_id: string;
  date: string;
  energy: number;
  training: 'none' | 'light' | 'moderate' | 'hard';
  hunger: 'low' | 'normal' | 'high';
  note: string | null;
  created_at: string;
};

function makeInMemoryRepo() {
  const store = new Map<string, Row>(); // key = `${userId}::${date}`

  return {
    _store: store,

    async today(userId: string, date: string): Promise<Row | null> {
      return store.get(`${userId}::${date}`) ?? null;
    },

    async upsert(userId: string, input: CheckinUpsert): Promise<Row> {
      const key = `${userId}::${input.date}`;
      const existing = store.get(key);
      const row: Row = {
        id: existing?.id ?? crypto.randomUUID(),
        user_id: userId,
        date: input.date,
        energy: input.energy,
        training: input.training,
        hunger: input.hunger,
        note: input.note ?? null,
        created_at: existing?.created_at ?? new Date().toISOString(),
      };
      store.set(key, row);
      return row;
    },

    async recent(userId: string, days = 7): Promise<Row[]> {
      return [...store.values()]
        .filter((r) => r.user_id === userId)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, days);
    },

    async range(userId: string, from: string, to: string): Promise<Row[]> {
      return [...store.values()]
        .filter((r) => r.user_id === userId && r.date >= from && r.date <= to)
        .sort((a, b) => b.date.localeCompare(a.date));
    },
  };
}

// ---------------------------------------------------------------------------
// Wire actions with the in-memory repo
// ---------------------------------------------------------------------------
const USER_ID = 'e2e-user';
const TODAY = '2026-04-26';

async function makeActions(repo: ReturnType<typeof makeInMemoryRepo>) {
  // Thin wrappers that mirror the real action signatures but skip Next.js wiring.
  async function getTodayCheckin(localDate?: string) {
    const date = localDate ?? TODAY;
    return repo.today(USER_ID, date);
  }

  async function saveCheckin(input: CheckinUpsert) {
    return repo.upsert(USER_ID, input);
  }

  async function listRecentCheckins(days = 7) {
    return repo.recent(USER_ID, days);
  }

  async function getCheckinsForRange(start: string, end: string) {
    return repo.range(USER_ID, start, end);
  }

  return { getTodayCheckin, saveCheckin, listRecentCheckins, getCheckinsForRange };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('check-in e2e flow', () => {
  it('save → getToday returns it', async () => {
    const repo = makeInMemoryRepo();
    const { saveCheckin, getTodayCheckin } = await makeActions(repo);

    const saved = await saveCheckin({ date: TODAY, energy: 4, training: 'light', hunger: 'normal' });
    expect(saved.energy).toBe(4);

    const today = await getTodayCheckin(TODAY);
    expect(today).not.toBeNull();
    expect(today?.energy).toBe(4);
    expect(today?.date).toBe(TODAY);
  });

  it('save again same date → upsert: single row, latest values', async () => {
    const repo = makeInMemoryRepo();
    const { saveCheckin, getTodayCheckin } = await makeActions(repo);

    await saveCheckin({ date: TODAY, energy: 2, training: 'none', hunger: 'low' });
    await saveCheckin({ date: TODAY, energy: 5, training: 'hard', hunger: 'high', note: 'crushed it' });

    // Store must have exactly one row for this user+date.
    expect(repo._store.size).toBe(1);

    const today = await getTodayCheckin(TODAY);
    expect(today?.energy).toBe(5);
    expect(today?.training).toBe('hard');
    expect(today?.hunger).toBe('high');
    expect(today?.note).toBe('crushed it');
  });

  it('listRecentCheckins returns rows ordered newest first', async () => {
    const repo = makeInMemoryRepo();
    const { saveCheckin, listRecentCheckins } = await makeActions(repo);

    await saveCheckin({ date: '2026-04-24', energy: 3, training: 'light', hunger: 'normal' });
    await saveCheckin({ date: '2026-04-25', energy: 4, training: 'none', hunger: 'low' });
    await saveCheckin({ date: TODAY, energy: 5, training: 'hard', hunger: 'high' });

    const recent = await listRecentCheckins(7);
    expect(recent[0]?.date).toBe(TODAY);
    expect(recent[2]?.date).toBe('2026-04-24');
  });

  it('getCheckinsForRange returns only rows in the range', async () => {
    const repo = makeInMemoryRepo();
    const { saveCheckin, getCheckinsForRange } = await makeActions(repo);

    await saveCheckin({ date: '2026-04-20', energy: 2, training: 'none', hunger: 'low' });
    await saveCheckin({ date: '2026-04-23', energy: 3, training: 'light', hunger: 'normal' });
    await saveCheckin({ date: TODAY, energy: 5, training: 'hard', hunger: 'high' });

    const result = await getCheckinsForRange('2026-04-21', TODAY);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.date)).not.toContain('2026-04-20');
  });
});
```

- [ ] **Step 2: Run e2e tests — expected GREEN immediately**

(This test is self-contained; no mocks needed for it to pass.)

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/server/checkin/__tests__/e2e-style.test.ts
```

Expected: all 4 assertions pass.

- [ ] **Step 3: Run full test suite for the feature**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/server/checkin/__tests__/
```

Expected: all tests across all three files pass.

- [ ] **Step 4: Commit**

```bash
git add src/server/checkin/__tests__/e2e-style.test.ts
git commit -m "checkin-test: e2e-style in-memory flow (save / today / upsert-dedup / range)"
```

---

### Task 7: `EnergySlider` and `CheckinForm` components

**Files:** `src/components/feature/checkin/EnergySlider.tsx`, `src/components/feature/checkin/CheckinForm.tsx`, `src/components/feature/checkin/index.ts`

The form is a Client Component. It manages local state for energy/training/hunger/note, calls `saveCheckin`, and uses `router.push('/feed-me')` on success. `EnergySlider` is a bespoke 1–5 picker that maps emoji labels to numeric values.

Note: `src/components/ui/` does not ship a `Slider` primitive. Energy input uses the bespoke `EnergySlider` built here, which renders five labeled buttons. If T1 later adds a `Slider` primitive, this component can be simplified.

- [ ] **Step 1: Write `src/components/feature/checkin/EnergySlider.tsx`**

```tsx
'use client';
import { cn } from '@/components/ui/utils';

const ENERGY_LABELS: Record<number, { label: string; description: string }> = {
  1: { label: '1', description: 'Depleted' },
  2: { label: '2', description: 'Low' },
  3: { label: '3', description: 'Okay' },
  4: { label: '4', description: 'Good' },
  5: { label: '5', description: 'Fired up' },
};

interface EnergySliderProps {
  value: number;
  onChange: (value: number) => void;
}

/**
 * Five-button energy picker (1–5). Uses design tokens only — no raw hex.
 */
export function EnergySlider({ value, onChange }: EnergySliderProps) {
  return (
    <div className="flex gap-2" role="group" aria-label="Energy level 1 to 5">
      {[1, 2, 3, 4, 5].map((level) => {
        const isActive = value === level;
        const meta = ENERGY_LABELS[level]!;
        return (
          <button
            key={level}
            type="button"
            aria-pressed={isActive}
            aria-label={`Energy ${level}: ${meta.description}`}
            onClick={() => onChange(level)}
            className={cn(
              'flex-1 rounded-lg py-3 text-center transition-all duration-snap',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'border',
              isActive
                ? 'bg-accent text-accent-fg border-accent font-semibold shadow-1'
                : 'bg-surface-elevated border-border text-text-muted hover:border-accent/40 hover:text-text',
            )}
          >
            <span className="block text-base font-mono">{meta.label}</span>
            <span className="block text-[10px] leading-tight mt-0.5">{meta.description}</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Write `src/components/feature/checkin/CheckinForm.tsx`**

```tsx
'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { saveCheckin } from '@/server/checkin/actions';
import { EnergySlider } from './EnergySlider';
import type { TrainingLevel, HungerLevel } from '@/contracts/zod/checkin';

interface CheckinFormProps {
  /** Pre-populate fields if editing an existing check-in. */
  defaultValues?: {
    energy: number;
    training: TrainingLevel;
    hunger: HungerLevel;
    note?: string | null;
  };
  /** ISO date string (YYYY-MM-DD) for the check-in. Defaults to today (UTC). */
  date: string;
}

const TRAINING_OPTIONS: { label: string; value: TrainingLevel }[] = [
  { label: 'Rest', value: 'none' },
  { label: 'Light', value: 'light' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'Hard', value: 'hard' },
];

const HUNGER_OPTIONS: { label: string; value: HungerLevel }[] = [
  { label: 'Low', value: 'low' },
  { label: 'Normal', value: 'normal' },
  { label: 'High', value: 'high' },
];

/**
 * Daily check-in form. Client Component — manages local state and calls
 * the `saveCheckin` server action on submit.
 */
export function CheckinForm({ defaultValues, date }: CheckinFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [energy, setEnergy] = useState<number>(defaultValues?.energy ?? 3);
  const [training, setTraining] = useState<TrainingLevel>(
    defaultValues?.training ?? 'none',
  );
  const [hunger, setHunger] = useState<HungerLevel>(defaultValues?.hunger ?? 'normal');
  const [note, setNote] = useState<string>(defaultValues?.note ?? '');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await saveCheckin({ date, energy, training, hunger, note: note.trim() || null });
        router.push('/feed-me');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Energy */}
      <div className="flex flex-col gap-3">
        <Label htmlFor="energy-group">Energy today</Label>
        <EnergySlider value={energy} onChange={setEnergy} />
      </div>

      {/* Training */}
      <div className="flex flex-col gap-3">
        <Label>Training</Label>
        <SegmentedControl
          options={TRAINING_OPTIONS}
          value={training}
          onChange={setTraining}
          className="w-full"
        />
      </div>

      {/* Hunger */}
      <div className="flex flex-col gap-3">
        <Label>Hunger</Label>
        <SegmentedControl
          options={HUNGER_OPTIONS}
          value={hunger}
          onChange={setHunger}
          className="w-full"
        />
      </div>

      {/* Optional note */}
      <div className="flex flex-col gap-3">
        <Label htmlFor="checkin-note">
          Note{' '}
          <span className="text-text-muted font-normal">(optional)</span>
        </Label>
        <textarea
          id="checkin-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Anything else on your mind?"
          className={[
            'flex w-full rounded-lg border border-border bg-surface-elevated px-3 py-2',
            'text-sm text-text placeholder:text-text-placeholder resize-none',
            'transition-colors duration-snap',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-40',
          ].join(' ')}
        />
      </div>

      {/* Error state */}
      {error && (
        <p role="alert" className="text-sm text-err">
          {error}
        </p>
      )}

      {/* Submit */}
      <Button type="submit" size="lg" disabled={isPending} className="w-full">
        {isPending ? 'Saving…' : 'Save & continue'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Write `src/components/feature/checkin/index.ts`**

```ts
export { CheckinForm } from './CheckinForm';
export { EnergySlider } from './EnergySlider';
export { CheckinSummary } from './CheckinSummary';
```

- [ ] **Step 4: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/feature/checkin/
git commit -m "checkin-ui: CheckinForm, EnergySlider feature components"
```

---

### Task 8: `CheckinSummary` component

**Files:** `src/components/feature/checkin/CheckinSummary.tsx`

Shown on the check-in page when a check-in for today already exists. Displays the current values and an "Edit" button that reveals the form again.

- [ ] **Step 1: Write `src/components/feature/checkin/CheckinSummary.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckinForm } from './CheckinForm';
import type { Checkin } from '@/contracts/zod/checkin';

interface CheckinSummaryProps {
  checkin: Checkin;
}

const TRAINING_LABELS: Record<string, string> = {
  none: 'Rest day',
  light: 'Light',
  moderate: 'Moderate',
  hard: 'Hard',
};

const HUNGER_LABELS: Record<string, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
};

/**
 * Displays today's check-in. Offers an inline "Edit" toggle that swaps
 * the summary for the full CheckinForm pre-populated with existing values.
 */
export function CheckinSummary({ checkin }: CheckinSummaryProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <CheckinForm
        date={checkin.date}
        defaultValues={{
          energy: checkin.energy,
          training: checkin.training,
          hunger: checkin.hunger,
          note: checkin.note,
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-muted">
        You've already checked in today. Here's what you logged:
      </p>

      <dl className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1 rounded-lg bg-surface-elevated p-3">
          <dt className="text-xs text-text-muted uppercase tracking-wide">Energy</dt>
          <dd className="font-mono text-2xl font-semibold text-text">{checkin.energy}<span className="text-sm font-normal text-text-muted">/5</span></dd>
        </div>
        <div className="flex flex-col gap-1 rounded-lg bg-surface-elevated p-3">
          <dt className="text-xs text-text-muted uppercase tracking-wide">Training</dt>
          <dd className="text-sm font-medium text-text">{TRAINING_LABELS[checkin.training] ?? checkin.training}</dd>
        </div>
        <div className="flex flex-col gap-1 rounded-lg bg-surface-elevated p-3">
          <dt className="text-xs text-text-muted uppercase tracking-wide">Hunger</dt>
          <dd className="text-sm font-medium text-text">{HUNGER_LABELS[checkin.hunger] ?? checkin.hunger}</dd>
        </div>
      </dl>

      {checkin.note && (
        <p className="text-sm text-text-muted italic">"{checkin.note}"</p>
      )}

      <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="self-start">
        Edit check-in
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/feature/checkin/CheckinSummary.tsx src/components/feature/checkin/index.ts
git commit -m "checkin-ui: CheckinSummary with inline edit affordance"
```

---

### Task 9: Check-in page

**Files:** `src/app/checkin/page.tsx`

Server Component. Fetches today's check-in via `getTodayCheckin()`. Renders `CheckinSummary` if a check-in exists, otherwise renders `CheckinForm`. Redirects unauthenticated users (via `requireUser()` inside `getTodayCheckin()`).

<!-- TODO: confirm with user — Should `/checkin` accept a `?date=YYYY-MM-DD` query param so the user can back-fill a missed day? Current implementation only supports today. -->

- [ ] **Step 1: Write `src/app/checkin/page.tsx`**

```tsx
import { getTodayCheckin } from '@/server/checkin/actions';
import { CheckinForm } from '@/components/feature/checkin/CheckinForm';
import { CheckinSummary } from '@/components/feature/checkin/CheckinSummary';

export const metadata = { title: 'Daily Check-in — WhatToEat' };

/**
 * Single-screen daily check-in.
 *
 * Server Component — fetches today's check-in on the server before rendering.
 * `getTodayCheckin()` calls `requireUser()` internally; unauthenticated
 * requests are redirected to `/auth/login` before this component renders.
 *
 * TODO: accept a `localDate` search param and forward it to `getTodayCheckin`
 * so the UTC vs. local-day ambiguity is resolved at the page level.
 */
export default async function CheckinPage() {
  // Derive today's ISO date string (UTC). T8 should pass localDate instead.
  // TODO: pass client's local date once T8 wires the feed-me context.
  const todayUtc = new Date().toISOString().slice(0, 10);
  const existing = await getTodayCheckin(todayUtc);

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-text tracking-tight">
          Daily Check-in
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {existing
            ? 'You're all set for today. Tap "Edit" to adjust.'
            : '3 taps, ~5 seconds. How are you feeling?'}
        </p>
      </header>

      {existing ? (
        <CheckinSummary checkin={existing} />
      ) : (
        <CheckinForm date={todayUtc} />
      )}
    </main>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/checkin/page.tsx
git commit -m "checkin-ui: /checkin page (form + summary with edit affordance)"
```

---

### Task 10: Wire `CheckinSheet` (Track 1 stub → real)

**Files:** `src/components/ui/checkin-sheet.tsx`

The Track 1 stub is a shell with a `<!-- Plan 07 fills -->` note. This task replaces it with the fully wired version that uses `CheckinForm` and `CheckinSummary`. This is the only file in `src/components/ui/` this plan touches, and only because T1 explicitly reserved this file for T7 to fill.

- [ ] **Step 1: Update `src/components/ui/checkin-sheet.tsx`**

```tsx
'use client';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { CheckinForm } from '@/components/feature/checkin/CheckinForm';
import { CheckinSummary } from '@/components/feature/checkin/CheckinSummary';
import type { Checkin } from '@/contracts/zod/checkin';

interface CheckinSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Today's existing check-in (if any). Passed down from a Server Component parent. */
  existingCheckin?: Checkin | null;
  /** Today's date as 'YYYY-MM-DD'. Caller should supply the local date. */
  date: string;
}

/**
 * Vaul bottom sheet for the daily check-in.
 * Renders CheckinSummary when a check-in already exists, otherwise CheckinForm.
 * Used on the Home screen; the standalone /checkin page uses the same components
 * directly without this sheet wrapper.
 */
export function CheckinSheet({
  open,
  onOpenChange,
  existingCheckin,
  date,
}: CheckinSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Daily Check-in</SheetTitle>
          <SheetDescription>
            {existingCheckin
              ? 'You've already checked in today.'
              : '3 taps, ~5 seconds. How are you feeling?'}
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 py-4">
          {existingCheckin ? (
            <CheckinSummary checkin={existingCheckin} />
          ) : (
            <CheckinForm date={date} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/checkin-sheet.tsx
git commit -m "checkin-ui: wire CheckinSheet stub with real form + summary"
```

---

### Task 11: Quality gate — typecheck, lint, full test suite

**Files:** none created; verification only.

- [ ] **Step 1: Full typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

Expected: exit 0, zero errors.

- [ ] **Step 2: Lint**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run lint
```

Expected: exit 0, zero warnings or errors.

- [ ] **Step 3: Full test suite**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test
```

Expected: all tests pass, including pre-existing tests on `main` and the new checkin suite.

- [ ] **Step 4: Verify file-ownership rule**

```bash
cd /Users/ravishah/Documents/whattoeat && git diff main --name-only
```

Expected: only files under:
- `src/server/checkin/`
- `src/app/checkin/`
- `src/components/feature/checkin/`
- `src/components/ui/checkin-sheet.tsx` (permitted stub fill)

No edits to `src/contracts/**`, `src/db/**`, `supabase/**`, `src/engine/**`, `tailwind.config.ts`, `.github/workflows/**`.

- [ ] **Step 5: Commit (if Step 4 shows no issues)**

No new files — this is a gate, not a commit task.

---

### Task 12: Manual smoke test

**Files:** none; browser verification.

- [ ] **Step 1: Start dev server**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run dev
```

- [ ] **Step 2: Visit `/checkin` unauthenticated**

Expected: redirected to `/auth/login` (middleware from T4).

- [ ] **Step 3: Sign in with a magic-link**

Expected: session established; redirected back (or navigate to `/checkin` manually).

- [ ] **Step 4: First visit — empty state**

Expected: form with 5 energy buttons, training SegmentedControl (Rest / Light / Moderate / Hard), hunger SegmentedControl (Low / Normal / High), optional note textarea, "Save & continue" button.

- [ ] **Step 5: Fill and submit**

Select energy=4, training=hard, hunger=high. Click "Save & continue".

Expected: redirect to `/feed-me`. (T8 is not implemented yet; any 404/stub page is fine.)

- [ ] **Step 6: Navigate back to `/checkin`**

Expected: `CheckinSummary` renders with energy 4/5, training "Hard", hunger "High". "Edit check-in" button visible.

- [ ] **Step 7: Click "Edit check-in" and change energy to 2**

Click "Save & continue" again.

Expected: redirected to `/feed-me`; on return to `/checkin`, summary now shows energy 2/5 (upsert worked; single row in DB).

- [ ] **Step 8: Verify upsert in Supabase Dashboard**

Open the Supabase table editor → `checkins`. Confirm exactly one row for your user + today's date, with the latest values.

---

### Task 13: Open PR

- [ ] **Step 1: Push branch**

```bash
git push -u origin wt/track-7-checkin
```

- [ ] **Step 2: Open PR**

```bash
gh pr create \
  --title "T7: Check-in feature (repo + actions + form + page)" \
  --base main \
  --body "$(cat <<'EOF'
## What

Implements the full daily check-in feature (Track 7).

## Changes

- **`src/server/checkin/repo.ts`** — Drizzle repo: `today`, `upsert`, `recent`, `range`.
- **`src/server/checkin/actions.ts`** — four Server Actions; auth sourced from `requireUser()` only.
- **`src/components/feature/checkin/`** — `EnergySlider`, `CheckinForm`, `CheckinSummary`.
- **`src/app/checkin/page.tsx`** — full-page check-in (form if new, summary if exists today).
- **`src/components/ui/checkin-sheet.tsx`** — wires T1 stub with real components.
- **`src/server/checkin/__tests__/`** — repo unit tests, action unit tests, e2e-style in-memory flow.

## Test plan

- [ ] `bun run typecheck` — exit 0
- [ ] `bun run lint` — exit 0
- [ ] `bun run test` — all tests pass
- [ ] `git diff main --name-only` — only owned paths
- [ ] Manual smoke test: empty state → fill → submit → summary → edit → upsert confirms one row

## Ambiguities (marked as TODOs in code)

- Timezone: server uses UTC day; T8 should pass `localDate` from the client.
- Training enum: Zod contract has `moderate`; spec data model section lists only `none/light/hard`. Using the contract as source of truth.
- Previous-day editing: not implemented; needs product confirmation.
EOF
)"
```

Expected: PR URL printed. CI must pass before merge.

---

## Definition of Done

- [ ] `bun run typecheck` exits 0.
- [ ] `bun run lint` exits 0.
- [ ] `bun run test` — all tests pass (repo, action, e2e-style).
- [ ] `git diff main --name-only` shows only owned paths.
- [ ] Manual smoke test complete (Task 12 all steps checked).
- [ ] PR open; CI green; code-reviewer verdict: `pass`.
- [ ] Ambiguities documented as `<!-- TODO: confirm with user -->` inline.

---

## Hand-off note to Track 8 (Feed Me)

T8 imports `getTodayCheckin` from `src/server/checkin` to populate `RecommendationContext.checkin`:

```ts
import { getTodayCheckin } from '@/server/checkin';

// In the Feed Me server action / route handler:
const checkin = await getTodayCheckin(localDate); // pass the client's local date
const ctx: RecommendationContext = {
  pantry,
  profile,
  checkin: checkin ?? undefined,
  // ...
};
```

The `Checkin` type from `@/contracts/zod/checkin` matches the `checkin?: Checkin` slot on `RecommendationContext` exactly — no mapping needed.

**Timezone hand-off:** T8 must supply `localDate` (the client's local `YYYY-MM-DD` string) when calling `getTodayCheckin`. The simplest pattern is to read it from a client-set cookie or pass it as a hidden field from the Home page Client Component that triggers the Feed Me flow.
