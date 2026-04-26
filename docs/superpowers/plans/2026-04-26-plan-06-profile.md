# Plan 06 — Profile Feature

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Profile feature end-to-end — a pure `computeTargets()` macro calculator (Mifflin-St Jeor + activity factor + goal adjustment), server-side repo + actions guarded by `requireUser()`, a read-only profile view page, and a full edit page with live macro preview. After this track merges, Track 8 ("Feed Me") can import `getMyProfile()` to populate `RecommendationContext.profile` without any additional plumbing.

**Architecture:** Three owned layers. (1) `src/lib/macros.ts` — pure function, zero I/O, fully unit-tested first (TDD). (2) `src/server/profile/` — `repo.ts` wraps Drizzle queries; `actions.ts` exposes three `'use server'` actions guarded by `requireUser()`. (3) `src/app/profile/` + `src/components/feature/profile/` — App Router pages (Server Components for data fetching, Client Components for interactive form) and composite UI components built from Track 1 primitives.

**Tech Stack:** Bun, Vitest (unit + action tests), Next.js 15 App Router, React 19, Zod (validation via `ProfileUpdate` from `src/contracts/zod/profile.ts`), Drizzle ORM (queries in `repo.ts`), `@supabase/ssr` (server client from Track 4). No new runtime dependencies are required.

**Spec reference:** `docs/superpowers/specs/2026-04-26-whattoeat-2.0-design.md` — sections 3 (Data Model / profiles table), 5 (Design System / custom components), 7 (Profile user flow — goals, macros, allergies, dislikes, cuisines, equipment, Connections placeholders).

**Prerequisites (verified before Task 1):**
- Track 0 merged to `main`: `src/contracts/zod/profile.ts` (Profile, ProfileUpdate, Goal, ActivityLevel, MacroTargets), `src/db/schema/profiles.ts` (Drizzle table), `supabase/migrations/0001_initial_schema.sql` (profiles table + RLS).
- Track 1 merged to `main`: `src/components/ui/` contains `Input`, `Label`, `SegmentedControl`, `Switch`, `StatTile`, `MacroRing`, and `PantryChip` (repurposed as `MultiSelectChips`).
- Track 4 merged to `main`: `src/server/auth/index.ts` exports `requireUser()` returning `{ userId: string; email: string }`.
- Branch `wt/track-6-profile` checked out from a fresh `main`.

---

## File Structure

### Creates

```
src/lib/macros.ts

src/server/profile/repo.ts
src/server/profile/actions.ts
src/server/profile/index.ts

src/server/profile/__tests__/macros.test.ts
src/server/profile/__tests__/repo.test.ts
src/server/profile/__tests__/actions.test.ts

src/components/feature/profile/ProfileView.tsx
src/components/feature/profile/MacroTargetsEditor.tsx
src/components/feature/profile/AllergyChipPicker.tsx
src/components/feature/profile/ProfileForm.tsx
src/components/feature/profile/index.ts

src/app/profile/page.tsx
src/app/profile/edit/page.tsx
```

### Modifies

```
(none — this track creates only new files)
```

### Does NOT touch (frozen by Track 0 or owned by other tracks)

```
src/contracts/**
src/db/**
supabase/**
src/engine/**
src/server/auth/**
src/components/ui/**
tailwind.config.ts
.github/workflows/**
```

---

## Conventions used in this plan

- All file paths are repo-relative; bash commands use the absolute path `/Users/ravishah/Documents/whattoeat`.
- `bun` is the package manager and test runner (`bun run test`, `bun run typecheck`).
- Imports use the `@/` alias (e.g. `@/lib/macros`, `@/server/profile`, `@/contracts/zod/profile`).
- Commit message prefixes: `profile:` for source files in `src/server/profile/` and `src/lib/macros.ts`, `profile-test:` for `src/server/profile/__tests__/`, `profile-ui:` for `src/app/profile/**` and `src/components/feature/profile/**`.
- **TDD discipline:** test files are written first (expected RED), implementation makes them GREEN. Steps are annotated `— expected RED` or `— expected GREEN`.
- **No client-supplied user IDs:** every DB query derives `userId` from `requireUser()`, never from request bodies or query params.
- **Macro auto-recompute policy:** `recomputeMacros()` derives targets from the current profile and persists them. `updateProfile()` calls `recomputeMacros()` automatically whenever biometric fields change (height, weight, birthdate, sex, activity_level, goal) **unless** the caller has explicitly set `targets` in the same patch — manual overrides win. See Task 7 for exact logic.
<!-- TODO: confirm with user — should recomputeMacros() only trigger when targets have never been manually set, or always on biometric change (overwriting prior manual edits)? Current plan: explicit targets in the patch = manual override wins; biometric-only patch = auto-recompute. -->

---

## Tasks

---

### Task 1: Macro calculation tests (TDD — RED first)

**Files:** `src/server/profile/__tests__/macros.test.ts`

Write the full test suite for `computeTargets()` before any implementation exists. The function is pure: given a `Profile`-shaped input it returns `{ kcal, protein_g, carbs_g, fat_g }`. Tests cover the Mifflin-St Jeor formula, all five activity factors, all three goal adjustments, and macro split percentages. Running these now must exit with failures (RED).

**Mifflin-St Jeor:**
- Male BMR = `(10 × weight_kg) + (6.25 × height_cm) − (5 × age_years) + 5`
- Female BMR = `(10 × weight_kg) + (6.25 × height_cm) − (5 × age_years) − 161`
- `other` / `prefer_not_to_say` sex → use male formula (conservative)

**Activity multipliers:**
| level         | factor |
|---------------|--------|
| sedentary     | 1.200  |
| light         | 1.375  |
| moderate      | 1.550  |
| active        | 1.725  |
| very_active   | 1.900  |

**Goal adjustments (applied to TDEE):**
| goal     | adjustment |
|----------|-----------|
| cut      | −20%      |
| maintain |   0%      |
| bulk     | +15%      |

**Macro split:**
- Protein: 1 g per lb of body weight (weight_kg × 2.20462), floored, capped at 250 g.
- Fat: 25% of final kcal ÷ 9 kcal/g, rounded to nearest gram.
- Carbs: remainder — `(kcal − protein_g × 4 − fat_g × 9) ÷ 4`, floored at 0.

**Fallbacks when fields are null:** if `height_cm`, `weight_kg`, or `birthdate` is null, `computeTargets()` returns `null`. The caller is responsible for showing an "incomplete profile" prompt.

- [ ] **Step 1: Create test file with 15+ cases**

Create `src/server/profile/__tests__/macros.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { computeTargets } from '@/lib/macros';
import type { Profile } from '@/contracts/zod/profile';

/** Minimal valid profile shape for testing */
function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    user_id: '00000000-0000-0000-0000-000000000001',
    display_name: 'Test User',
    goal: 'maintain',
    targets: { kcal: 2000, protein_g: 150, carbs_g: 200, fat_g: 55 },
    height_cm: 175,
    weight_kg: 80,
    birthdate: '1990-01-01',
    sex: 'male',
    activity_level: 'moderate',
    allergies: [],
    dislikes: [],
    cuisines: [],
    equipment: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('computeTargets', () => {
  // ── Null-safety ──────────────────────────────────────────────────────────
  it('returns null when height_cm is null', () => {
    expect(computeTargets(makeProfile({ height_cm: null }))).toBeNull();
  });
  it('returns null when weight_kg is null', () => {
    expect(computeTargets(makeProfile({ weight_kg: null }))).toBeNull();
  });
  it('returns null when birthdate is null', () => {
    expect(computeTargets(makeProfile({ birthdate: null }))).toBeNull();
  });

  // ── Mifflin-St Jeor BMR ──────────────────────────────────────────────────
  it('computes correct BMR for male 80 kg / 175 cm / 36 yrs, moderate, maintain', () => {
    // BMR = (10*80) + (6.25*175) - (5*36) + 5 = 800 + 1093.75 - 180 + 5 = 1718.75
    // TDEE = 1718.75 * 1.55 = 2664.06 → kcal ≈ 2664
    const result = computeTargets(makeProfile({ birthdate: '1990-04-26' }));
    expect(result).not.toBeNull();
    expect(result!.kcal).toBeGreaterThan(2600);
    expect(result!.kcal).toBeLessThan(2730);
  });

  it('computes correct BMR for female 60 kg / 165 cm / 30 yrs, moderate, maintain', () => {
    // BMR = (10*60) + (6.25*165) - (5*30) - 161 = 600 + 1031.25 - 150 - 161 = 1320.25
    // TDEE = 1320.25 * 1.55 ≈ 2046
    const result = computeTargets(
      makeProfile({
        weight_kg: 60,
        height_cm: 165,
        birthdate: '1996-04-26',
        sex: 'female',
      }),
    );
    expect(result).not.toBeNull();
    expect(result!.kcal).toBeGreaterThan(2000);
    expect(result!.kcal).toBeLessThan(2100);
  });

  it('treats "other" sex same as male formula', () => {
    const male = computeTargets(makeProfile({ sex: 'male' }));
    const other = computeTargets(makeProfile({ sex: 'other' }));
    expect(male!.kcal).toBe(other!.kcal);
  });

  it('treats "prefer_not_to_say" sex same as male formula', () => {
    const male = computeTargets(makeProfile({ sex: 'male' }));
    const pnts = computeTargets(makeProfile({ sex: 'prefer_not_to_say' }));
    expect(male!.kcal).toBe(pnts!.kcal);
  });

  // ── Activity factors ─────────────────────────────────────────────────────
  it('sedentary factor 1.2 produces lower kcal than moderate 1.55', () => {
    const sed = computeTargets(makeProfile({ activity_level: 'sedentary' }));
    const mod = computeTargets(makeProfile({ activity_level: 'moderate' }));
    expect(sed!.kcal).toBeLessThan(mod!.kcal);
  });

  it('very_active factor 1.9 produces highest kcal of all levels', () => {
    const va = computeTargets(makeProfile({ activity_level: 'very_active' }));
    const active = computeTargets(makeProfile({ activity_level: 'active' }));
    expect(va!.kcal).toBeGreaterThan(active!.kcal);
  });

  it('light activity (1.375) is between sedentary and moderate', () => {
    const sed = computeTargets(makeProfile({ activity_level: 'sedentary' }));
    const light = computeTargets(makeProfile({ activity_level: 'light' }));
    const mod = computeTargets(makeProfile({ activity_level: 'moderate' }));
    expect(light!.kcal).toBeGreaterThan(sed!.kcal);
    expect(light!.kcal).toBeLessThan(mod!.kcal);
  });

  // ── Goal adjustments ─────────────────────────────────────────────────────
  it('cut reduces kcal by ~20% vs maintain', () => {
    const maintain = computeTargets(makeProfile({ goal: 'maintain' }));
    const cut = computeTargets(makeProfile({ goal: 'cut' }));
    expect(cut!.kcal).toBeCloseTo(maintain!.kcal * 0.8, -1);
  });

  it('bulk increases kcal by ~15% vs maintain', () => {
    const maintain = computeTargets(makeProfile({ goal: 'maintain' }));
    const bulk = computeTargets(makeProfile({ goal: 'bulk' }));
    expect(bulk!.kcal).toBeCloseTo(maintain!.kcal * 1.15, -1);
  });

  // ── Macro split ──────────────────────────────────────────────────────────
  it('protein is 1 g per lb body weight (80 kg ≈ 176 lb → 176 g)', () => {
    const result = computeTargets(makeProfile({ weight_kg: 80 }));
    expect(result!.protein_g).toBe(176);
  });

  it('protein is capped at 250 g for very heavy subjects', () => {
    const result = computeTargets(makeProfile({ weight_kg: 150 }));
    expect(result!.protein_g).toBeLessThanOrEqual(250);
  });

  it('fat is approximately 25% of kcal', () => {
    const result = computeTargets(makeProfile());
    const fatKcal = result!.fat_g * 9;
    const ratio = fatKcal / result!.kcal;
    expect(ratio).toBeGreaterThan(0.22);
    expect(ratio).toBeLessThan(0.28);
  });

  it('macro calories sum to approximately total kcal (within ±10)', () => {
    const result = computeTargets(makeProfile());
    const sum = result!.protein_g * 4 + result!.carbs_g * 4 + result!.fat_g * 9;
    expect(Math.abs(sum - result!.kcal)).toBeLessThan(10);
  });

  it('carbs are non-negative even on aggressive cut with high protein', () => {
    const result = computeTargets(
      makeProfile({ goal: 'cut', weight_kg: 120, activity_level: 'sedentary' }),
    );
    expect(result!.carbs_g).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Run tests — expected RED**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/server/profile/__tests__/macros.test.ts 2>&1 | tail -20
```

Expected: multiple failures — `computeTargets` does not exist yet.

- [ ] **Step 3: Commit RED tests**

```bash
git add src/server/profile/__tests__/macros.test.ts
git commit -m "profile-test: macro calc test suite (TDD red — 15 cases)"
```

---

### Task 2: Implement `computeTargets()` (GREEN)

**Files:** `src/lib/macros.ts`

Implement the pure function. No imports from `next`, `@supabase/*`, Drizzle, or any I/O package — this file must stay importable from the engine layer if needed. The function signature is `computeTargets(profile: Profile): MacroTargets | null`.

- [ ] **Step 1: Create `src/lib/macros.ts`**

```ts
import type { MacroTargets, Profile } from '@/contracts/zod/profile';

const ACTIVITY_FACTORS: Record<string, number> = {
  sedentary:  1.2,
  light:      1.375,
  moderate:   1.55,
  active:     1.725,
  very_active: 1.9,
};

const GOAL_ADJUSTMENTS: Record<string, number> = {
  cut:      0.8,
  maintain: 1.0,
  bulk:     1.15,
};

/**
 * Computes macro targets from a Profile using Mifflin-St Jeor BMR,
 * an activity multiplier, and a goal adjustment.
 *
 * Returns null if any required biometric field (height_cm, weight_kg,
 * birthdate) is null — the caller should prompt the user to complete
 * their profile.
 *
 * Pure function: deterministic, no I/O, safe to call in any context.
 */
export function computeTargets(profile: Profile): MacroTargets | null {
  const { height_cm, weight_kg, birthdate, sex, activity_level, goal } = profile;

  if (height_cm == null || weight_kg == null || birthdate == null) {
    return null;
  }

  // Age in whole years relative to today
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasBirthdayPassed) age -= 1;

  // Mifflin-St Jeor BMR
  // Male (and conservative fallback for 'other'/'prefer_not_to_say'):
  //   BMR = 10w + 6.25h − 5a + 5
  // Female:
  //   BMR = 10w + 6.25h − 5a − 161
  const sexOffset = sex === 'female' ? -161 : 5;
  const bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + sexOffset;

  // TDEE = BMR × activity factor
  const factor = ACTIVITY_FACTORS[activity_level ?? 'sedentary'] ?? 1.2;
  const tdee = bmr * factor;

  // Goal-adjusted calorie target
  const goalFactor = GOAL_ADJUSTMENTS[goal] ?? 1.0;
  const kcal = Math.round(tdee * goalFactor);

  // Macro split
  // Protein: 1 g per lb of body weight, capped at 250 g
  const protein_g = Math.min(Math.floor(weight_kg * 2.20462), 250);

  // Fat: 25% of kcal, converted to grams (9 kcal/g)
  const fat_g = Math.round((kcal * 0.25) / 9);

  // Carbs: remainder calories ÷ 4 kcal/g, floored at 0
  const carbKcal = kcal - protein_g * 4 - fat_g * 9;
  const carbs_g = Math.max(Math.floor(carbKcal / 4), 0);

  return { kcal, protein_g, carbs_g, fat_g };
}
```

- [ ] **Step 2: Run tests — expected GREEN**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/server/profile/__tests__/macros.test.ts 2>&1 | tail -10
```

Expected: 15+ passing, 0 failures.

- [ ] **Step 3: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck 2>&1 | tail -10
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/macros.ts
git commit -m "profile: implement computeTargets() — Mifflin-St Jeor + activity + goal"
```

---

### Task 3: Profile repo (DB layer tests — RED)

**Files:** `src/server/profile/__tests__/repo.test.ts`

Write mock-based unit tests for `getProfileByUserId` and `upsertProfile`. Use `vi.mock` to stub the Drizzle client — no live DB required. Tests assert correct table targets, correct field mapping, and that `user_id` is always the one from the argument (never trusting external input).

- [ ] **Step 1: Create `src/server/profile/__tests__/repo.test.ts`**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the db client before importing the repo
vi.mock('@/db/client', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

// We'll import the repo after the mock is in place
// (dynamic import used so the mock is hoisted correctly)

describe('profileRepo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getProfileByUserId calls db.select with correct userId filter', async () => {
    const { db } = await import('@/db/client');
    const mockChain = { from: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue([]) };
    vi.mocked(db.select).mockReturnValue(mockChain as never);

    const { getProfileByUserId } = await import('@/server/profile/repo');
    const result = await getProfileByUserId('user-abc');

    expect(db.select).toHaveBeenCalledTimes(1);
    expect(mockChain.where).toHaveBeenCalledTimes(1);
    expect(result).toBeNull(); // empty array → null
  });

  it('getProfileByUserId returns mapped Profile when row exists', async () => {
    const { db } = await import('@/db/client');
    const fakeRow = {
      user_id: 'user-abc',
      display_name: 'Ravi',
      goal: 'maintain',
      target_kcal: 2200,
      target_protein_g: 160,
      target_carbs_g: 240,
      target_fat_g: 61,
      height_cm: '175.0',
      weight_kg: '80.0',
      birthdate: '1990-01-01',
      sex: 'male',
      activity_level: 'moderate',
      allergies: [],
      dislikes: [],
      cuisines: [],
      equipment: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const mockChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([fakeRow]),
    };
    vi.mocked(db.select).mockReturnValue(mockChain as never);

    const { getProfileByUserId } = await import('@/server/profile/repo');
    const result = await getProfileByUserId('user-abc');

    expect(result).not.toBeNull();
    expect(result!.user_id).toBe('user-abc');
    expect(result!.goal).toBe('maintain');
    expect(result!.targets.kcal).toBe(2200);
  });

  it('upsertProfile inserts when no existing row', async () => {
    const { db } = await import('@/db/client');
    const insertMock = {
      into: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      onConflictDoUpdate: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([
        {
          user_id: 'user-abc',
          display_name: null,
          goal: 'bulk',
          target_kcal: 3000,
          target_protein_g: 180,
          target_carbs_g: 350,
          target_fat_g: 80,
          height_cm: null,
          weight_kg: null,
          birthdate: null,
          sex: null,
          activity_level: null,
          allergies: [],
          dislikes: [],
          cuisines: [],
          equipment: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]),
    };
    vi.mocked(db.insert).mockReturnValue(insertMock as never);

    const { upsertProfile } = await import('@/server/profile/repo');
    const result = await upsertProfile('user-abc', {
      goal: 'bulk',
      targets: { kcal: 3000, protein_g: 180, carbs_g: 350, fat_g: 80 },
    });

    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(result.goal).toBe('bulk');
  });
});
```

- [ ] **Step 2: Run tests — expected RED**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/server/profile/__tests__/repo.test.ts 2>&1 | tail -10
```

Expected: failures — `@/server/profile/repo` does not exist yet.

- [ ] **Step 3: Commit RED repo tests**

```bash
git add src/server/profile/__tests__/repo.test.ts
git commit -m "profile-test: repo unit tests (TDD red)"
```

---

### Task 4: Implement `src/server/profile/repo.ts` (GREEN)

**Files:** `src/server/profile/repo.ts`

Implement `getProfileByUserId` and `upsertProfile`. Uses Drizzle's query builder against the `profiles` table. Maps DB rows (which have flat `target_kcal / target_protein_g / ...` columns) to the contract's `Profile` type (which nests them under `targets: MacroTargets`).

- [ ] **Step 1: Create `src/server/profile/repo.ts`**

```ts
import { db } from '@/db/client';
import { profiles } from '@/db/schema/profiles';
import type { Profile, ProfileUpdate } from '@/contracts/zod/profile';
import { eq } from 'drizzle-orm';

/** Maps a Drizzle profile row to the contract Profile shape. */
function rowToProfile(row: typeof profiles.$inferSelect): Profile {
  return {
    user_id: row.user_id,
    display_name: row.display_name ?? null,
    goal: row.goal as Profile['goal'],
    targets: {
      kcal: row.target_kcal,
      protein_g: row.target_protein_g,
      carbs_g: row.target_carbs_g,
      fat_g: row.target_fat_g,
    },
    height_cm: row.height_cm != null ? Number(row.height_cm) : null,
    weight_kg: row.weight_kg != null ? Number(row.weight_kg) : null,
    birthdate: row.birthdate ?? null,
    sex: (row.sex as Profile['sex']) ?? null,
    activity_level: (row.activity_level as Profile['activity_level']) ?? null,
    allergies: (row.allergies as string[]) ?? [],
    dislikes: (row.dislikes as string[]) ?? [],
    cuisines: (row.cuisines as string[]) ?? [],
    equipment: (row.equipment as string[]) ?? [],
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

/**
 * Fetches the profile for a given userId.
 * Returns null if no profile row exists yet (triggers onboarding).
 */
export async function getProfileByUserId(userId: string): Promise<Profile | null> {
  const rows = await db.select().from(profiles).where(eq(profiles.user_id, userId));
  if (rows.length === 0) return null;
  return rowToProfile(rows[0]!);
}

/**
 * Upserts a profile row. On conflict (same user_id) updates only the
 * provided fields. Always sets updated_at via the DB trigger.
 */
export async function upsertProfile(
  userId: string,
  patch: ProfileUpdate,
): Promise<Profile> {
  const { targets, ...rest } = patch;

  const values = {
    user_id: userId,
    ...(rest.display_name !== undefined && { display_name: rest.display_name }),
    ...(rest.goal !== undefined && { goal: rest.goal }),
    ...(targets?.kcal !== undefined && { target_kcal: targets.kcal }),
    ...(targets?.protein_g !== undefined && { target_protein_g: targets.protein_g }),
    ...(targets?.carbs_g !== undefined && { target_carbs_g: targets.carbs_g }),
    ...(targets?.fat_g !== undefined && { target_fat_g: targets.fat_g }),
    ...(rest.height_cm !== undefined && { height_cm: rest.height_cm?.toString() }),
    ...(rest.weight_kg !== undefined && { weight_kg: rest.weight_kg?.toString() }),
    ...(rest.birthdate !== undefined && { birthdate: rest.birthdate }),
    ...(rest.sex !== undefined && { sex: rest.sex }),
    ...(rest.activity_level !== undefined && { activity_level: rest.activity_level }),
    ...(rest.allergies !== undefined && { allergies: rest.allergies }),
    ...(rest.dislikes !== undefined && { dislikes: rest.dislikes }),
    ...(rest.cuisines !== undefined && { cuisines: rest.cuisines }),
    ...(rest.equipment !== undefined && { equipment: rest.equipment }),
  };

  const rows = await db
    .insert(profiles)
    .values({ user_id: userId, goal: 'maintain', target_kcal: 2000,
               target_protein_g: 150, target_carbs_g: 220, target_fat_g: 55,
               ...values })
    .onConflictDoUpdate({
      target: profiles.user_id,
      set: values,
    })
    .returning();

  return rowToProfile(rows[0]!);
}
```

- [ ] **Step 2: Run repo tests — expected GREEN**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/server/profile/__tests__/repo.test.ts 2>&1 | tail -10
```

Expected: all passing.

- [ ] **Step 3: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add src/server/profile/repo.ts
git commit -m "profile: implement profile repo (getProfileByUserId, upsertProfile)"
```

---

### Task 5: Server action tests (RED)

**Files:** `src/server/profile/__tests__/actions.test.ts`

Test that `getMyProfile`, `updateProfile`, and `recomputeMacros` correctly thread the `userId` from `requireUser()` into every DB call, and that `updateProfile` validates input via Zod before persisting.

- [ ] **Step 1: Create `src/server/profile/__tests__/actions.test.ts`**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock auth helper
vi.mock('@/server/auth', () => ({
  requireUser: vi.fn().mockResolvedValue({ userId: 'user-test-123', email: 'test@example.com' }),
}));

// Mock the repo
vi.mock('@/server/profile/repo', () => ({
  getProfileByUserId: vi.fn(),
  upsertProfile: vi.fn(),
}));

// Mock macros
vi.mock('@/lib/macros', () => ({
  computeTargets: vi.fn(),
}));

describe('getMyProfile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls requireUser() and threads userId into getProfileByUserId', async () => {
    const { requireUser } = await import('@/server/auth');
    const { getProfileByUserId } = await import('@/server/profile/repo');
    vi.mocked(getProfileByUserId).mockResolvedValue(null);

    const { getMyProfile } = await import('@/server/profile/actions');
    const result = await getMyProfile();

    expect(requireUser).toHaveBeenCalledTimes(1);
    expect(getProfileByUserId).toHaveBeenCalledWith('user-test-123');
    expect(result).toBeNull();
  });
});

describe('updateProfile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('validates input via Zod — rejects invalid goal', async () => {
    const { updateProfile } = await import('@/server/profile/actions');
    await expect(
      updateProfile({ goal: 'invalid-goal' as never }),
    ).rejects.toThrow();
  });

  it('threads userId from requireUser into upsertProfile', async () => {
    const { upsertProfile } = await import('@/server/profile/repo');
    const { computeTargets } = await import('@/lib/macros');

    const fakeProfile = {
      user_id: 'user-test-123',
      goal: 'bulk',
      targets: { kcal: 3000, protein_g: 180, carbs_g: 350, fat_g: 80 },
      height_cm: null, weight_kg: null, birthdate: null,
      sex: null, activity_level: null,
      display_name: null, allergies: [], dislikes: [], cuisines: [], equipment: [],
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    vi.mocked(upsertProfile).mockResolvedValue(fakeProfile as never);
    vi.mocked(computeTargets).mockReturnValue(null); // no biometrics → skip recompute

    const { updateProfile } = await import('@/server/profile/actions');
    await updateProfile({ goal: 'bulk' });

    expect(upsertProfile).toHaveBeenCalledWith(
      'user-test-123',
      expect.objectContaining({ goal: 'bulk' }),
    );
  });

  it('auto-recomputes macros when biometric fields change and no explicit targets in patch', async () => {
    const { upsertProfile } = await import('@/server/profile/repo');
    const { computeTargets } = await import('@/lib/macros');
    const { getProfileByUserId } = await import('@/server/profile/repo');

    const baseProfile = {
      user_id: 'user-test-123',
      goal: 'maintain',
      targets: { kcal: 2000, protein_g: 150, carbs_g: 220, fat_g: 55 },
      height_cm: 175, weight_kg: 80, birthdate: '1990-01-01',
      sex: 'male', activity_level: 'moderate',
      display_name: null, allergies: [], dislikes: [], cuisines: [], equipment: [],
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    vi.mocked(getProfileByUserId).mockResolvedValue(baseProfile as never);
    vi.mocked(computeTargets).mockReturnValue({
      kcal: 2664, protein_g: 176, carbs_g: 288, fat_g: 74,
    });
    vi.mocked(upsertProfile).mockResolvedValue({ ...baseProfile, weight_kg: 85 } as never);

    const { updateProfile } = await import('@/server/profile/actions');
    await updateProfile({ weight_kg: 85 });

    expect(computeTargets).toHaveBeenCalledTimes(1);
    // Should persist new targets
    expect(upsertProfile).toHaveBeenCalledWith(
      'user-test-123',
      expect.objectContaining({
        targets: { kcal: 2664, protein_g: 176, carbs_g: 288, fat_g: 74 },
      }),
    );
  });
});

describe('recomputeMacros', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches current profile, computes targets, and persists them', async () => {
    const { getProfileByUserId, upsertProfile } = await import('@/server/profile/repo');
    const { computeTargets } = await import('@/lib/macros');

    const profile = {
      user_id: 'user-test-123',
      goal: 'cut',
      targets: { kcal: 1800, protein_g: 160, carbs_g: 150, fat_g: 50 },
      height_cm: 175, weight_kg: 80, birthdate: '1990-01-01',
      sex: 'male', activity_level: 'active',
      display_name: null, allergies: [], dislikes: [], cuisines: [], equipment: [],
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    vi.mocked(getProfileByUserId).mockResolvedValue(profile as never);
    vi.mocked(computeTargets).mockReturnValue({
      kcal: 2100, protein_g: 176, carbs_g: 200, fat_g: 58,
    });
    vi.mocked(upsertProfile).mockResolvedValue({ ...profile } as never);

    const { recomputeMacros } = await import('@/server/profile/actions');
    await recomputeMacros();

    expect(computeTargets).toHaveBeenCalledWith(profile);
    expect(upsertProfile).toHaveBeenCalledWith(
      'user-test-123',
      expect.objectContaining({
        targets: { kcal: 2100, protein_g: 176, carbs_g: 200, fat_g: 58 },
      }),
    );
  });
});
```

- [ ] **Step 2: Run tests — expected RED**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/server/profile/__tests__/actions.test.ts 2>&1 | tail -10
```

- [ ] **Step 3: Commit RED action tests**

```bash
git add src/server/profile/__tests__/actions.test.ts
git commit -m "profile-test: server action tests (TDD red)"
```

---

### Task 6: Implement `src/server/profile/actions.ts` (GREEN)

**Files:** `src/server/profile/actions.ts`, `src/server/profile/index.ts`

Three `'use server'` actions. All guard via `requireUser()`. `updateProfile` validates input with `ProfileUpdate` Zod schema. Auto-recompute logic: if the patch contains biometric fields but not explicit `targets`, fetch the current profile, merge the patch, and call `computeTargets()` to derive new targets before persisting.

<!-- TODO: confirm with user — if a user has manually fine-tuned their targets (e.g. lowered protein for preference), a biometric-only patch (e.g. updating weight) will overwrite those manual tweaks with the computed values. Is that acceptable, or should we add a `targets_locked: boolean` flag to the profile schema? Current plan assumes overwrite is acceptable; targets are always editable post-compute on the edit page. -->

- [ ] **Step 1: Create `src/server/profile/actions.ts`**

```ts
'use server';

import { requireUser } from '@/server/auth';
import { getProfileByUserId, upsertProfile } from '@/server/profile/repo';
import { computeTargets } from '@/lib/macros';
import { ProfileUpdate } from '@/contracts/zod/profile';
import type { Profile } from '@/contracts/zod/profile';

const BIOMETRIC_FIELDS = new Set<string>([
  'height_cm', 'weight_kg', 'birthdate', 'sex', 'activity_level', 'goal',
]);

/**
 * Returns the current user's profile, or null if they haven't completed
 * onboarding yet. Null return should redirect to /onboarding.
 */
export async function getMyProfile(): Promise<Profile | null> {
  const { userId } = await requireUser();
  return getProfileByUserId(userId);
}

/**
 * Validates and persists a partial profile update.
 * If the patch touches any biometric field and does not explicitly provide
 * `targets`, the action fetches the current profile, merges the patch,
 * and calls computeTargets() — persisting new auto-computed targets.
 * Explicit `targets` in the patch always win (manual override).
 */
export async function updateProfile(patch: Partial<Profile>): Promise<Profile> {
  const { userId } = await requireUser();

  // Validate via Zod — throws ZodError on invalid input
  const validated = ProfileUpdate.parse(patch);

  const patchKeys = Object.keys(validated);
  const hasBiometric = patchKeys.some((k) => BIOMETRIC_FIELDS.has(k));
  const hasExplicitTargets = 'targets' in validated && validated.targets != null;

  let finalPatch = { ...validated };

  if (hasBiometric && !hasExplicitTargets) {
    // Merge patch onto current profile to get a complete picture for computeTargets
    const current = await getProfileByUserId(userId);
    if (current) {
      const merged: Profile = { ...current, ...validated };
      const computed = computeTargets(merged);
      if (computed) {
        finalPatch = { ...finalPatch, targets: computed };
      }
    }
  }

  return upsertProfile(userId, finalPatch);
}

/**
 * Re-derives macro targets from the current profile's biometrics and
 * persists them, overwriting whatever is currently stored.
 * Useful from the edit page's "Recalculate" button.
 */
export async function recomputeMacros(): Promise<Profile> {
  const { userId } = await requireUser();
  const current = await getProfileByUserId(userId);
  if (!current) {
    throw new Error('No profile found — complete onboarding first.');
  }
  const computed = computeTargets(current);
  if (!computed) {
    throw new Error('Cannot compute targets: profile is missing biometric fields.');
  }
  return upsertProfile(userId, { targets: computed });
}
```

- [ ] **Step 2: Create `src/server/profile/index.ts`**

```ts
export { getMyProfile, updateProfile, recomputeMacros } from './actions';
```

- [ ] **Step 3: Run all profile tests — expected GREEN**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/server/profile/ 2>&1 | tail -15
```

Expected: all 15+ macro tests + 3 repo tests + action tests passing.

- [ ] **Step 4: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add src/server/profile/actions.ts src/server/profile/index.ts
git commit -m "profile: implement server actions (getMyProfile, updateProfile, recomputeMacros)"
```

---

### Task 7: `AllergyChipPicker` composite component

**Files:** `src/components/feature/profile/AllergyChipPicker.tsx`

A client-side multi-select chip picker backed by a string array in state. Reuses `PantryChip` from Track 1 ui for the chip appearance, but operates purely on `string[]` rather than pantry categories. Supports a curated suggestions list (passed as a prop) and free-add via a text input.

- [ ] **Step 1: Create `src/components/feature/profile/AllergyChipPicker.tsx`**

```tsx
'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/components/ui/utils';
import { XIcon } from 'lucide-react';

interface AllergyChipPickerProps {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  className?: string;
}

/**
 * MultiSelectChips built for Profile dietary preferences.
 * - Renders current selections as removable chips.
 * - Suggestion pills below for one-tap add.
 * - Free-add via keyboard (Enter or comma) in the text input.
 */
export function AllergyChipPicker({
  label,
  value,
  onChange,
  suggestions = [],
  placeholder = 'Type and press Enter…',
  className,
}: AllergyChipPickerProps) {
  const [inputVal, setInputVal] = React.useState('');

  function add(item: string) {
    const trimmed = item.trim().toLowerCase();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setInputVal('');
  }

  function remove(item: string) {
    onChange(value.filter((v) => v !== item));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(inputVal);
    }
    if (e.key === 'Backspace' && inputVal === '' && value.length > 0) {
      remove(value[value.length - 1]!);
    }
  }

  const unusedSuggestions = suggestions.filter((s) => !value.includes(s.toLowerCase()));

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <span className="text-sm font-medium text-text">{label}</span>

      {/* Selected chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-elevated px-2.5 py-0.5 text-sm font-medium text-text"
            >
              {item}
              <button
                type="button"
                aria-label={`Remove ${item}`}
                onClick={() => remove(item)}
                className="rounded-full p-0.5 hover:bg-text/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <XIcon strokeWidth={1.75} className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Free-add input */}
      <Input
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={`Add ${label}`}
      />

      {/* Suggestion pills */}
      {unusedSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unusedSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className={cn(
                'rounded-full border border-border/60 bg-surface px-2.5 py-0.5',
                'text-xs text-text-muted transition-colors duration-snap',
                'hover:border-accent/60 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add src/components/feature/profile/AllergyChipPicker.tsx
git commit -m "profile-ui: AllergyChipPicker — multi-select chip input with suggestions"
```

---

### Task 8: `MacroTargetsEditor` composite component

**Files:** `src/components/feature/profile/MacroTargetsEditor.tsx`

A controlled client component that renders four numeric inputs (kcal, protein, carbs, fat) alongside a "Recalculate" button that calls `recomputeMacros()`. Accepts `targets` + `onChange` for live preview wiring in `ProfileForm`. Shows a `StatTile` per macro for at-a-glance reading. Locks macro total display (auto-calculated from inputs).

- [ ] **Step 1: Create `src/components/feature/profile/MacroTargetsEditor.tsx`**

```tsx
'use client';

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { StatTile } from '@/components/ui/stat-tile';
import { cn } from '@/components/ui/utils';
import type { MacroTargets } from '@/contracts/zod/profile';

interface MacroTargetsEditorProps {
  targets: MacroTargets;
  onChange: (next: MacroTargets) => void;
  onRecalculate?: () => Promise<void>;
  isRecalculating?: boolean;
  className?: string;
}

/**
 * MacroTargetsEditor — four numeric inputs for kcal/protein/carbs/fat with
 * live calorie balance display and a "Recalculate from biometrics" button.
 */
export function MacroTargetsEditor({
  targets,
  onChange,
  onRecalculate,
  isRecalculating = false,
  className,
}: MacroTargetsEditorProps) {
  function patch(field: keyof MacroTargets, raw: string) {
    const val = parseInt(raw, 10);
    if (isNaN(val) || val < 0) return;
    onChange({ ...targets, [field]: val });
  }

  // Calorie balance from macros (for informational display only)
  const calculatedKcal =
    targets.protein_g * 4 + targets.carbs_g * 4 + targets.fat_g * 9;
  const delta = targets.kcal - calculatedKcal;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* At-a-glance tiles */}
      <div className="grid grid-cols-4 gap-2">
        <StatTile label="kcal" value={targets.kcal} tone="warm" />
        <StatTile label="protein" value={targets.protein_g} unit="g" />
        <StatTile label="carbs" value={targets.carbs_g} unit="g" />
        <StatTile label="fat" value={targets.fat_g} unit="g" />
      </div>

      {/* Editable fields */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            { key: 'kcal', label: 'Calories (kcal)' },
            { key: 'protein_g', label: 'Protein (g)' },
            { key: 'carbs_g', label: 'Carbs (g)' },
            { key: 'fat_g', label: 'Fat (g)' },
          ] as { key: keyof MacroTargets; label: string }[]
        ).map(({ key, label }) => (
          <div key={key} className="flex flex-col gap-1">
            <Label htmlFor={`macro-${key}`}>{label}</Label>
            <Input
              id={`macro-${key}`}
              type="number"
              min={0}
              value={targets[key]}
              onChange={(e) => patch(key, e.target.value)}
              className="font-mono"
            />
          </div>
        ))}
      </div>

      {/* Balance indicator */}
      {Math.abs(delta) > 5 && (
        <p className="text-xs text-text-muted">
          Macro math totals{' '}
          <span className="font-mono font-semibold text-text">{calculatedKcal}</span> kcal —{' '}
          {delta > 0 ? `${delta} kcal below macro total` : `${Math.abs(delta)} kcal above macro total`}.
          Adjust to align.
        </p>
      )}

      {/* Recalculate button */}
      {onRecalculate && (
        <button
          type="button"
          onClick={onRecalculate}
          disabled={isRecalculating}
          className={cn(
            'self-start rounded-lg border border-border px-3 py-1.5 text-sm font-medium',
            'text-text-muted transition-colors duration-snap',
            'hover:border-accent/60 hover:text-text',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-40',
          )}
        >
          {isRecalculating ? 'Recalculating…' : '↺ Recalculate from biometrics'}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add src/components/feature/profile/MacroTargetsEditor.tsx
git commit -m "profile-ui: MacroTargetsEditor — editable macro inputs with balance display"
```

---

### Task 9: `ProfileForm` composite component

**Files:** `src/components/feature/profile/ProfileForm.tsx`

The main edit form. Controlled component with local state initialized from the `Profile` prop. On submit, calls `updateProfile()` server action. On biometric change, derives a live macro preview via the client-side `computeTargets()` import (this is a pure function — safe to call client-side). Uses `SegmentedControl` for goal, `Input`+`Label` for height/weight/birthdate, `AllergyChipPicker` for the four dietary arrays, and `MacroTargetsEditor` for targets.

<!-- TODO: confirm with user — live preview calls computeTargets() on every keystroke in height/weight/birthdate fields. Age calculation in computeTargets() uses `new Date()` (today's date). This is acceptable for preview fidelity; actual persistence always goes through the server action which re-derives server-side. -->

- [ ] **Step 1: Create `src/components/feature/profile/ProfileForm.tsx`**

```tsx
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { MacroTargetsEditor } from './MacroTargetsEditor';
import { AllergyChipPicker } from './AllergyChipPicker';
import { updateProfile, recomputeMacros } from '@/server/profile/actions';
import { computeTargets } from '@/lib/macros';
import type { Profile, MacroTargets } from '@/contracts/zod/profile';
import { cn } from '@/components/ui/utils';

const GOAL_OPTIONS = [
  { label: 'Cut', value: 'cut' },
  { label: 'Maintain', value: 'maintain' },
  { label: 'Bulk', value: 'bulk' },
] as const;

const ACTIVITY_OPTIONS = [
  { label: 'Sedentary', value: 'sedentary' },
  { label: 'Light', value: 'light' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'Active', value: 'active' },
  { label: 'Very Active', value: 'very_active' },
] as const;

const ALLERGY_SUGGESTIONS = [
  'gluten', 'dairy', 'eggs', 'nuts', 'peanuts', 'shellfish', 'fish', 'soy', 'sesame',
];
const CUISINE_SUGGESTIONS = [
  'Italian', 'Japanese', 'Mexican', 'Indian', 'Mediterranean', 'Thai', 'Chinese',
  'Middle Eastern', 'American', 'Korean',
];
const EQUIPMENT_SUGGESTIONS = [
  'air fryer', 'instant pot', 'slow cooker', 'grill', 'blender', 'food processor',
  'cast iron', 'wok', 'stand mixer',
];

interface ProfileFormProps {
  profile: Profile;
  className?: string;
}

/**
 * Full-page profile edit form with live macro preview.
 * On submit, calls updateProfile() server action and navigates back to /profile.
 */
export function ProfileForm({ profile, className }: ProfileFormProps) {
  const router = useRouter();
  const [draft, setDraft] = React.useState<Profile>(profile);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isRecalculating, setIsRecalculating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Live macro preview derived client-side from biometrics
  const previewTargets = React.useMemo(
    () => computeTargets(draft) ?? draft.targets,
    [draft],
  );

  function patchDraft(fields: Partial<Profile>) {
    setDraft((prev) => ({ ...prev, ...fields }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await updateProfile({
        display_name: draft.display_name,
        goal: draft.goal,
        targets: draft.targets,
        height_cm: draft.height_cm,
        weight_kg: draft.weight_kg,
        birthdate: draft.birthdate,
        sex: draft.sex,
        activity_level: draft.activity_level,
        allergies: draft.allergies,
        dislikes: draft.dislikes,
        cuisines: draft.cuisines,
        equipment: draft.equipment,
      });
      router.push('/profile');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRecalculate() {
    setIsRecalculating(true);
    try {
      const updated = await recomputeMacros();
      setDraft((prev) => ({ ...prev, targets: updated.targets }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not recalculate targets.');
    } finally {
      setIsRecalculating(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn('flex flex-col gap-8', className)}>
      {/* ── Goal ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-text">Goal</h2>
        <SegmentedControl
          options={GOAL_OPTIONS}
          value={draft.goal}
          onChange={(goal) => patchDraft({ goal })}
        />
      </section>

      {/* ── Body ── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-text">Body</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="height_cm">Height (cm)</Label>
            <Input
              id="height_cm"
              type="number"
              min={100}
              max={250}
              step={0.1}
              value={draft.height_cm ?? ''}
              onChange={(e) =>
                patchDraft({ height_cm: e.target.value ? Number(e.target.value) : null })
              }
              placeholder="175"
              className="font-mono"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="weight_kg">Weight (kg)</Label>
            <Input
              id="weight_kg"
              type="number"
              min={30}
              max={300}
              step={0.1}
              value={draft.weight_kg ?? ''}
              onChange={(e) =>
                patchDraft({ weight_kg: e.target.value ? Number(e.target.value) : null })
              }
              placeholder="80"
              className="font-mono"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="birthdate">Date of Birth</Label>
          <Input
            id="birthdate"
            type="date"
            value={draft.birthdate ?? ''}
            onChange={(e) => patchDraft({ birthdate: e.target.value || null })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Sex</Label>
          <SegmentedControl
            options={[
              { label: 'Male', value: 'male' },
              { label: 'Female', value: 'female' },
              { label: 'Other', value: 'other' },
              { label: 'Prefer not to say', value: 'prefer_not_to_say' },
            ]}
            value={draft.sex ?? 'prefer_not_to_say'}
            onChange={(sex) => patchDraft({ sex })}
            size="sm"
          />
        </div>
      </section>

      {/* ── Activity ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-text">Activity Level</h2>
        <SegmentedControl
          options={ACTIVITY_OPTIONS}
          value={draft.activity_level ?? 'sedentary'}
          onChange={(activity_level) => patchDraft({ activity_level })}
          size="sm"
        />
      </section>

      {/* ── Macro Targets ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-text">Macro Targets</h2>
        <p className="text-sm text-text-muted">
          Auto-calculated from your biometrics. Edit manually to override.
        </p>
        <MacroTargetsEditor
          targets={previewTargets}
          onChange={(targets) => patchDraft({ targets })}
          onRecalculate={handleRecalculate}
          isRecalculating={isRecalculating}
        />
      </section>

      {/* ── Dietary Preferences ── */}
      <section className="flex flex-col gap-5">
        <h2 className="text-base font-semibold text-text">Dietary Preferences</h2>
        <AllergyChipPicker
          label="Allergies & Intolerances"
          value={draft.allergies}
          onChange={(allergies) => patchDraft({ allergies })}
          suggestions={ALLERGY_SUGGESTIONS}
          placeholder="E.g. gluten, dairy…"
        />
        <AllergyChipPicker
          label="Dislikes"
          value={draft.dislikes}
          onChange={(dislikes) => patchDraft({ dislikes })}
          placeholder="E.g. cilantro, olives…"
        />
        <AllergyChipPicker
          label="Cuisine Preferences"
          value={draft.cuisines}
          onChange={(cuisines) => patchDraft({ cuisines })}
          suggestions={CUISINE_SUGGESTIONS}
          placeholder="E.g. Italian, Japanese…"
        />
        <AllergyChipPicker
          label="Kitchen Equipment"
          value={draft.equipment}
          onChange={(equipment) => patchDraft({ equipment })}
          suggestions={EQUIPMENT_SUGGESTIONS}
          placeholder="E.g. air fryer, wok…"
        />
      </section>

      {/* ── Error ── */}
      {error && (
        <p role="alert" className="rounded-lg bg-err/10 px-3 py-2 text-sm text-err">
          {error}
        </p>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center gap-3 pb-8">
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            'rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg shadow-1',
            'transition-all duration-snap hover:opacity-90 active:scale-[0.98]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-40',
          )}
        >
          {isSubmitting ? 'Saving…' : 'Save Profile'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/profile')}
          className={cn(
            'rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-text-muted',
            'transition-colors duration-snap hover:text-text',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create `src/components/feature/profile/index.ts`**

```ts
export { ProfileView } from './ProfileView';
export { ProfileForm } from './ProfileForm';
export { MacroTargetsEditor } from './MacroTargetsEditor';
export { AllergyChipPicker } from './AllergyChipPicker';
```

(Note: `ProfileView` is authored in Task 10.)

- [ ] **Step 3: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add src/components/feature/profile/ProfileForm.tsx src/components/feature/profile/index.ts
git commit -m "profile-ui: ProfileForm — full edit form with live macro preview"
```

---

### Task 10: `ProfileView` read-only component + view page

**Files:** `src/components/feature/profile/ProfileView.tsx`, `src/app/profile/page.tsx`

`ProfileView` is a read-only Server Component that renders the user's goal, macro tiles, dietary preferences, and a "Connections" placeholder section for future health platform integrations. The App Router page (`src/app/profile/page.tsx`) fetches the profile via `getMyProfile()` server-side and either redirects to `/onboarding` (null profile) or renders `ProfileView`.

- [ ] **Step 1: Create `src/components/feature/profile/ProfileView.tsx`**

```tsx
import { StatTile } from '@/components/ui/stat-tile';
import { MacroRing } from '@/components/ui/macro-ring';
import Link from 'next/link';
import type { Profile } from '@/contracts/zod/profile';

interface ProfileViewProps {
  profile: Profile;
}

const GOAL_LABELS: Record<string, string> = {
  cut: 'Cut — Calorie Deficit',
  maintain: 'Maintain — Calorie Balance',
  bulk: 'Bulk — Calorie Surplus',
};

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentary',
  light: 'Lightly Active',
  moderate: 'Moderately Active',
  active: 'Active',
  very_active: 'Very Active',
};

/**
 * ProfileView — read-only display of profile data.
 * Intended to render inside src/app/profile/page.tsx (Server Component).
 */
export function ProfileView({ profile }: ProfileViewProps) {
  const { targets, goal, activity_level, allergies, dislikes, cuisines, equipment } = profile;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">
            {profile.display_name ?? 'Your Profile'}
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {GOAL_LABELS[goal] ?? goal}
            {activity_level && ` · ${ACTIVITY_LABELS[activity_level] ?? activity_level}`}
          </p>
        </div>
        <Link
          href="/profile/edit"
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Edit
        </Link>
      </div>

      {/* Macro ring + stat tiles */}
      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-text">Daily Targets</h2>
        <div className="flex items-center gap-4">
          <MacroRing
            consumed={{ kcal: 0, protein: 0, carbs: 0, fat: 0 }}
            target={{
              kcal: targets.kcal,
              protein: targets.protein_g,
              carbs: targets.carbs_g,
              fat: targets.fat_g,
            }}
            size={100}
          />
          <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile label="kcal / day" value={targets.kcal} tone="warm" />
            <StatTile label="protein" value={targets.protein_g} unit="g" />
            <StatTile label="carbs" value={targets.carbs_g} unit="g" />
            <StatTile label="fat" value={targets.fat_g} unit="g" />
          </div>
        </div>
      </section>

      {/* Dietary preferences */}
      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-text">Dietary Preferences</h2>
        <PreferenceRow label="Allergies" items={allergies} emptyText="None listed" />
        <PreferenceRow label="Dislikes" items={dislikes} emptyText="None listed" />
        <PreferenceRow label="Cuisines" items={cuisines} emptyText="Any cuisine" />
        <PreferenceRow label="Equipment" items={equipment} emptyText="Standard kitchen" />
      </section>

      {/* Connections — Coming Soon */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-text">Connections</h2>
        <p className="text-sm text-text-muted">
          Connect health platforms to improve recommendations.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            { name: 'Apple Health', icon: '🍎' },
            { name: 'Eight Sleep', icon: '🛏' },
            { name: 'Superpower Labs', icon: '⚡' },
          ].map(({ name, icon }) => (
            <div
              key={name}
              className="flex items-center gap-3 rounded-xl border border-border/50 bg-surface-elevated px-4 py-3 opacity-50"
            >
              <span className="text-xl">{icon}</span>
              <div>
                <p className="text-sm font-medium text-text">{name}</p>
                <p className="text-xs text-text-muted">Coming soon</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PreferenceRow({
  label,
  items,
  emptyText,
}: {
  label: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</span>
      {items.length === 0 ? (
        <span className="text-sm text-text-muted/60 italic">{emptyText}</span>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              key={item}
              className="rounded-full border border-border bg-surface-elevated px-2.5 py-0.5 text-sm text-text"
            >
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/profile/page.tsx`**

```tsx
import { redirect } from 'next/navigation';
import { getMyProfile } from '@/server/profile/actions';
import { ProfileView } from '@/components/feature/profile/ProfileView';

export const metadata = { title: 'Profile — WhatToEat' };

/**
 * Profile view page — Server Component.
 * Redirects to /onboarding when no profile exists yet.
 */
export default async function ProfilePage() {
  const profile = await getMyProfile();
  if (!profile) redirect('/onboarding');

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <ProfileView profile={profile} />
    </main>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add src/components/feature/profile/ProfileView.tsx src/app/profile/page.tsx
git commit -m "profile-ui: ProfileView component + /profile view page"
```

---

### Task 11: Profile edit page

**Files:** `src/app/profile/edit/page.tsx`

Server Component that loads the current profile (or bootstraps a default via `updateProfile`) then renders `ProfileForm` inside a `<main>` container.

- [ ] **Step 1: Create `src/app/profile/edit/page.tsx`**

```tsx
import { redirect } from 'next/navigation';
import { getMyProfile } from '@/server/profile/actions';
import { ProfileForm } from '@/components/feature/profile/ProfileForm';

export const metadata = { title: 'Edit Profile — WhatToEat' };

/**
 * Profile edit page — Server Component.
 * Fetches the current profile server-side; redirects to /onboarding if none
 * exists so the user completes the full onboarding flow instead of partial edit.
 */
export default async function ProfileEditPage() {
  const profile = await getMyProfile();
  if (!profile) redirect('/onboarding');

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-text">Edit Profile</h1>
        <p className="mt-1 text-sm text-text-muted">
          Update your body stats and preferences to refine your macro targets.
        </p>
      </div>
      <ProfileForm profile={profile} />
    </main>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add src/app/profile/edit/page.tsx
git commit -m "profile-ui: /profile/edit page — wraps ProfileForm in a Server Component"
```

---

### Task 12: Full test suite + typecheck + lint

**Files:** (no new files — verification pass)

Run the complete test suite, typecheck, and lint to confirm this track is clean before raising the PR.

- [ ] **Step 1: Run all profile tests**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/server/profile/ src/lib/macros.ts 2>&1 | tail -20
```

Expected: all tests pass (15+ macro tests, 3+ repo tests, 4+ action tests).

- [ ] **Step 2: Full project typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

Expected: exit 0 with no errors.

- [ ] **Step 3: Lint**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run lint
```

Expected: exit 0, no lint errors or warnings.

- [ ] **Step 4: Verify only owned paths were modified**

```bash
cd /Users/ravishah/Documents/whattoeat && git diff --name-only main..HEAD
```

Expected: only paths under `src/lib/macros.ts`, `src/server/profile/**`, `src/app/profile/**`, `src/components/feature/profile/**`. Any other path is a violation — fix before proceeding.

- [ ] **Step 5: Commit verification note**

No new commit needed — this is the gate before the PR.

---

### Task 13: Manual smoke test + PR

**Files:** (no new files — integration verification)

Run the dev server and manually verify the profile feature end-to-end.

- [ ] **Step 1: Start dev server**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run dev
```

- [ ] **Step 2: Smoke test checklist**

Navigate to `http://localhost:3000` and verify:

- [ ] `/profile` — with a logged-in user who has no profile row, confirms redirect to `/onboarding`.
- [ ] `/profile` — with a profile row in the DB, renders `ProfileView` with correct macro tiles and dietary preference chips.
- [ ] `/profile/edit` — renders `ProfileForm` pre-filled with current values.
- [ ] Edit form: change goal from `maintain` to `cut` → macro preview updates live (kcal tiles drop ~20%).
- [ ] Edit form: update height/weight → macro preview recalculates without a page reload.
- [ ] Edit form: add an allergy via the `AllergyChipPicker` suggestion pills → chip appears; click X removes it.
- [ ] Edit form: add a free-text allergy via keyboard Enter → chip appears.
- [ ] "Recalculate from biometrics" button → calls `recomputeMacros()`, updates `targets` in form state.
- [ ] Submit → navigates to `/profile`, shows updated values.
- [ ] `/profile/edit` "Cancel" → returns to `/profile` without changes.
- [ ] Check DB row in Supabase Studio: `updated_at` has been refreshed; `allergies` column has correct JSON.

- [ ] **Step 3: Open PR**

```bash
cd /Users/ravishah/Documents/whattoeat && gh pr create \
  --title "Track 6: Profile feature — macros, edit page, dietary preferences" \
  --base main \
  --head wt/track-6-profile \
  --body "$(cat <<'EOF'
## Summary

- Pure \`computeTargets()\` (Mifflin-St Jeor + activity factor + goal adjustment) in \`src/lib/macros.ts\` — 15 unit tests, fully TDD.
- Server actions (\`getMyProfile\`, \`updateProfile\`, \`recomputeMacros\`) in \`src/server/profile/actions.ts\` guarded by \`requireUser()\`.
- Drizzle repo layer (\`src/server/profile/repo.ts\`) mapping flat DB columns to nested \`targets: MacroTargets\` contract shape.
- Composite UI components: \`ProfileForm\` (full edit with live macro preview), \`MacroTargetsEditor\`, \`AllergyChipPicker\`, \`ProfileView\`.
- App Router pages: \`/profile\` (read-only view) and \`/profile/edit\` (full form).
- All paths are within owned scope; no edits to frozen contracts, db schema, or ui primitives.

## Test plan

- [ ] \`bun run test src/server/profile/\` — all tests green.
- [ ] \`bun run typecheck\` — exit 0.
- [ ] \`bun run lint\` — exit 0.
- [ ] Manual smoke test per Task 13 checklist.
- [ ] Verify \`git diff --name-only main..HEAD\` shows only owned paths.
EOF
)"
```

---

### Task 14: Definition of Done

Mark this track complete only when **all** of the following are true:

- [ ] **Typecheck** — `bun run typecheck` exits 0.
- [ ] **Lint** — `bun run lint` exits 0.
- [ ] **Tests** — `bun run test src/server/profile/ src/lib/macros.ts` — all green, ≥ 22 tests passing.
- [ ] **File ownership** — `git diff --name-only main..HEAD` contains only `src/lib/macros.ts`, `src/server/profile/**`, `src/app/profile/**`, `src/components/feature/profile/**`. Zero drive-by edits to shared paths.
- [ ] **No forbidden imports** — `src/lib/macros.ts` imports nothing from `next`, `@supabase/*`, `drizzle-orm`, or any I/O package.
- [ ] **RLS respected** — `updateProfile()` and `getMyProfile()` use `requireUser()` userId exclusively; userId is never sourced from request body or query params.
- [ ] **Smoke test** — Task 13 checklist fully checked.
- [ ] **PR open** — PR raised against `main` on branch `wt/track-6-profile`, code-reviewer verdict `pass`.

---

## Hand-off Notes

### Track 8 ("Feed Me") integration

Track 8 imports `getMyProfile` to populate `RecommendationContext.profile`:

```ts
// src/server/recommendation/context.ts (Track 8 — example)
import { getMyProfile } from '@/server/profile';
// ...
const profile = await getMyProfile();
if (!profile) throw new ServerError('not_found', 'Complete your profile before using Feed Me.');
const ctx: RecommendationContext = { profile, pantry, checkin, signals: {}, request };
```

No additional plumbing is needed from Track 6 — `getMyProfile()` is the complete, ready-to-use surface.

### Track 10 (Home + Onboarding) integration

The onboarding "Set goal" pane (Track 10) re-uses `ProfileForm`'s individual sub-components (`SegmentedControl` for goal, `AllergyChipPicker` for dietary preferences) rather than the full `ProfileForm`. It calls `updateProfile()` at onboarding completion to create the initial profile row. The redirect from `ProfilePage` / `ProfileEditPage` when `profile === null` → `/onboarding` is already wired in Tasks 10 and 11.

### Ambiguities flagged inline

1. `<!-- TODO: confirm with user -->` in Conventions — manual override vs. always-recompute policy for `recomputeMacros()`.
2. `<!-- TODO: confirm with user -->` in Task 6 — whether a `targets_locked: boolean` flag is needed to protect manual macro edits from being overwritten by biometric-only patches.
3. `<!-- TODO: confirm with user -->` in Task 9 — live preview uses `new Date()` client-side for age calculation; confirm this is acceptable for preview fidelity (server-side compute always authoritative).
