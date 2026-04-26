# Plan 10 — Home + Onboarding + Signature Moments

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the WhatToEat 2.0 public landing page, authenticated home dashboard, and the first-run onboarding stepper — so that a brand-new user who clicks a magic-link is guided step-by-step through goal selection, body-data entry, macro-target confirmation, allergen tagging, and an optional first pantry seed before landing on a rich home dashboard that surfaces their macro ring, pantry stats, Feed Me CTA, latest check-in peek, and last cooked recipe. The middleware layer gains a first-run redirect gate so that incomplete onboarders can never reach the home dashboard prematurely.

**Implements after T1, T5, T6, T8 land — do not start this track until those PRs are merged to main.**

**Architecture:** Three distinct surfaces share one owned path tree. (1) The public landing at `src/app/(public)/page.tsx` is a zero-auth React Server Component with a magic-link CTA that funnels new visitors into the auth flow. (2) The authenticated home at `src/app/(authenticated)/home/page.tsx` is an RSC shell that pre-fetches profile, pantry counts, today's check-in, and the last cooked recipe in parallel, then renders a bento-style grid of feature tiles. (3) The onboarding stepper at `src/app/onboarding/` is a multi-step server-driven wizard where each step is an independent RSC + server action pair — no client-side state machine required, progress is encoded in the URL step param and in partial profile writes. The middleware (`src/middleware.ts`, owned by Track 4) gains a thin extension hook in `src/lib/onboarding/redirect.ts` that determines whether the current user must be sent to `/onboarding` rather than `/home`.

**Tech Stack:** Bun, Vitest, Next.js 15 App Router (Server Components, `'use server'` actions, `redirect()`), React 19, `@supabase/ssr`, Zod, design-system primitives from Track 1 (`Button`, `Input`, `Label`, `StatTile`, `MacroRing`, `SegmentedControl`, `PantryChip`, `Separator`, `Toast`), `computeTargets` from `src/lib/macros.ts` (Track 6), `requireUser` from `src/server/auth` (Track 4), Drizzle ORM (via profile repo from Track 6), `lucide-react` icons.

**Spec reference:** `docs/superpowers/specs/` — sections 2 (architecture / RSC-first), 4 (server action pattern), 5 (Design System, Home tile grid, Feed Me CTA staged motion), 7 (onboarding flow, user profile flow), 8 (auth/RLS, middleware route guard).

**Prerequisites (verified before Task 1):**
- Track 0 merged to `main`: `src/contracts/zod/profile.ts` (Profile, ProfileUpdate, Goal, ActivityLevel), `src/db/schema/profiles.ts`, RLS policies exist.
- Track 1 merged to `main`: full design-system primitive set in `src/components/ui/`, `cn()` at `@/components/ui/utils`, tokens wired into Tailwind.
- Track 4 merged to `main`: `src/server/auth/index.ts` exports `requireUser()` and `getUserId()`; `src/middleware.ts` refreshes the session cookie and guards `/(authenticated)/**`.
- Track 5 merged to `main`: `src/server/pantry/index.ts` exports `listActivePantryItems(supabase, userId)`.
- Track 6 merged to `main`: `src/server/profile/index.ts` exports `getMyProfile(supabase, userId)` and `upsertProfile(supabase, userId, patch)`; `src/lib/macros.ts` exports `computeTargets(input)`.
- Track 8 merged to `main`: `src/app/(authenticated)/feed-me/` page exists (so the Feed Me CTA can link there).
- `bun run typecheck` exits 0 on `main`.
- Branch `wt/track-10-home-onboarding` checked out from a fresh `main`.

---

## Worktree note

This track runs in the dedicated worktree on branch `wt/track-10-home-onboarding`. Never commit directly to `main`. Create the worktree with:

```bash
bash /Users/ravishah/Documents/whattoeat/scripts/wt.sh track-10-home-onboarding
```

All bash commands use the absolute path `/Users/ravishah/Documents/whattoeat`. Do not `cd` mid-task; prefix every command with the full path or use `-C` flags.

---

## Dependency note

This plan **implements after T1/T5/T6/T8 land**. The table below shows what each upstream track supplies and where it is consumed in this plan.

| Upstream | Export consumed | Used in |
|---|---|---|
| T1 | `Button`, `Input`, `Label`, `StatTile`, `MacroRing`, `SegmentedControl`, `PantryChip`, `Separator`, `Toast` | Every component in this plan |
| T4 | `requireUser()`, `getUserId()`, `src/middleware.ts` | All server actions, middleware extension |
| T5 | `listActivePantryItems(supabase, userId)` | `PantryStat`, home pre-fetch |
| T6 | `getMyProfile()`, `upsertProfile()`, `computeTargets()` | Onboarding steps 2-5, home macro ring |
| T8 | `/feed-me` route | Feed Me CTA href |

---

## File Structure

### Creates

```
# Onboarding redirect logic (extends middleware without touching owned paths)
src/lib/onboarding/redirect.ts            — needsOnboarding(profile): boolean
src/lib/onboarding/steps.ts              — STEPS constant, step metadata, step guards
src/lib/onboarding/index.ts              — barrel re-export

# Onboarding app routes (one folder per step)
src/app/onboarding/layout.tsx            — OnboardingStepFrame shell (stepper bar)
src/app/onboarding/page.tsx              — step=1 redirect entry point
src/app/onboarding/step/[step]/page.tsx  — dynamic step RSC
src/app/onboarding/step/[step]/actions.ts — 'use server' for each step form

# Onboarding feature components
src/components/feature/home/OnboardingStepper.tsx   — progress indicator bar
src/components/feature/home/OnboardingStepFrame.tsx — card shell with back/next chrome
src/components/feature/home/GoalStep.tsx             — step 1: goal selection
src/components/feature/home/BodyDataStep.tsx         — step 2: height/weight/age/sex/activity
src/components/feature/home/ConfirmTargetsStep.tsx   — step 3: review computed macros, override
src/components/feature/home/AllergensStep.tsx        — step 4: allergen multi-select chips
src/components/feature/home/PantrySeedStep.tsx       — step 5: optional first pantry seed

# Public landing
src/app/(public)/page.tsx                — hero + magic-link CTA (no auth gate)
src/app/(public)/layout.tsx              — thin public layout (no auth nav)

# Authenticated home
src/app/(authenticated)/home/page.tsx    — bento home dashboard RSC
src/app/(authenticated)/home/loading.tsx — skeleton grid
src/app/(authenticated)/home/error.tsx   — error boundary fallback

# Home feature components
src/components/feature/home/HomeMacroRing.tsx   — pure SVG donut for protein/carbs/fat
src/components/feature/home/PantryStat.tsx      — pantry item count + low-stock nudge
src/components/feature/home/CheckinPeek.tsx     — today's check-in tile
src/components/feature/home/LastCookedCard.tsx  — last cooked recipe thumbnail tile
src/components/feature/home/FeedMeCta.tsx       — hero CTA button with bloom animation
src/components/feature/home/index.ts            — barrel re-export

# Tests
src/lib/onboarding/__tests__/redirect.test.ts
src/lib/onboarding/__tests__/steps.test.ts
src/app/(authenticated)/home/__tests__/home.snapshot.test.tsx
src/app/onboarding/__tests__/onboarding-flow.integration.test.ts
```

### Modifies

```
src/middleware.ts   — adds onboarding redirect call after session refresh (small, surgical patch)
```

### Does NOT touch (frozen or owned by other tracks)

```
src/contracts/**          — Track 0
src/db/**                 — Track 0
supabase/**               — Track 0
src/engine/**             — Track 2
src/server/adapters/**    — Track 3
src/server/auth/**        — Track 4 (import only)
src/server/pantry/**      — Track 5 (import only)
src/server/profile/**     — Track 6 (import only)
src/server/checkin/**     — Track 7 (import only)
src/server/recipes/**     — Track 9 (import only)
src/components/ui/**      — Track 1 (import only, never edit)
tailwind.config.ts        — Track 1
src/styles/**             — Track 1
.github/workflows/**      — CI infra
```

---

## Conventions used in this plan

- All file paths are repo-relative. Bash commands use the absolute path `/Users/ravishah/Documents/whattoeat`.
- `bun` is the package manager and test runner (`bun run test`, `bun run typecheck`, `bun run lint`).
- All imports use the `@/` alias for `src/`.
- `Profile`, `ProfileUpdate`, `Goal`, `ActivityLevel`, `MacroTargets` always imported from `@/contracts/zod/profile` — never redefined.
- `ActionResult<T>` always imported from `@/server/contracts`.
- `computeTargets` always imported from `@/lib/macros`.
- Commit message prefixes: `home:` for `src/app/(authenticated)/home/**` and `src/app/(public)/**`, `onboarding:` for `src/app/onboarding/**` and `src/lib/onboarding/**`, `home-ui:` for `src/components/feature/home/**`.
- **TDD discipline:** every test task is written first (expected RED), then the implementation makes it GREEN. Steps are annotated `— expected RED` or `— expected GREEN`.
- **RSC-first:** pages are Server Components unless interactivity is required. Client islands are the minimum surface needed for transitions and optimistic updates.
- **No client-supplied user IDs:** every DB call derives `userId` from `requireUser()` or `getUserId()`. URL params like `?step=3` are trusted only for navigation, never for user identity.
- **Onboarding idempotency:** every step action is safe to replay — if a user refreshes mid-onboarding the server writes the same partial data again without error.
- **Middleware surgical patch:** this plan patches `src/middleware.ts` in exactly one place (after the session-refresh block). The patch calls `onboardingRedirect(userId, pathname)` which is a pure function imported from `@/lib/onboarding/redirect`. This keeps the middleware diff minimal and reviewable.

---

## Table of Contents

1. Task 1 — Verify prerequisites and branch setup
2. Task 2 — Onboarding redirect logic (`src/lib/onboarding/`)
3. Task 3 — Middleware surgical patch
4. Task 4 — Onboarding layout + stepper component
5. Task 5 — Onboarding steps 1-3 (goal, body data, confirm targets)
6. Task 6 — Onboarding steps 4-5 (allergens, pantry seed)
7. Task 7 — Public landing page (`src/app/(public)/page.tsx`)
8. Task 8 — Authenticated home page + feature components
9. Task 9 — `HomeMacroRing` pure SVG component
10. Task 10 — `CheckinPeek` + `LastCookedCard` tiles
11. Task 11 — Tests: redirect logic + home snapshot
12. Task 12 — Integration test: full onboarding flow simulation

---
## Tasks

---

### Task 1: Verify prerequisites and branch setup

**Files touched:** none (read-only checks + branch creation)

Before writing a single line of application code, confirm that every upstream track's exports are present and that the new worktree is clean. Catching a missing dependency here costs five minutes; catching it in Task 8 costs an hour.

#### Step 1.1 — Verify upstream exports exist

```bash
# Track 1 design-system primitives
ls /Users/ravishah/Documents/whattoeat/src/components/ui/button.tsx \
   /Users/ravishah/Documents/whattoeat/src/components/ui/input.tsx \
   /Users/ravishah/Documents/whattoeat/src/components/ui/label.tsx \
   /Users/ravishah/Documents/whattoeat/src/components/ui/stat-tile.tsx \
   /Users/ravishah/Documents/whattoeat/src/components/ui/macro-ring.tsx \
   /Users/ravishah/Documents/whattoeat/src/components/ui/segmented-control.tsx \
   /Users/ravishah/Documents/whattoeat/src/components/ui/pantry-chip.tsx \
   /Users/ravishah/Documents/whattoeat/src/components/ui/separator.tsx \
   /Users/ravishah/Documents/whattoeat/src/components/ui/toast.tsx
```

Expected: all nine files found. If any are missing, Track 1 is not fully merged — do not proceed until it is.

```bash
# Track 4 auth helpers
grep -r "requireUser" /Users/ravishah/Documents/whattoeat/src/server/auth/index.ts | head -5
grep -r "getUserId" /Users/ravishah/Documents/whattoeat/src/server/auth/index.ts | head -5
```

Expected: both exports present.

```bash
# Track 5 pantry repo
grep "listActivePantryItems" /Users/ravishah/Documents/whattoeat/src/server/pantry/index.ts
```

Expected: export found.

```bash
# Track 6 profile repo + macros
grep "getMyProfile\|upsertProfile" /Users/ravishah/Documents/whattoeat/src/server/profile/index.ts
grep "computeTargets" /Users/ravishah/Documents/whattoeat/src/lib/macros.ts
```

Expected: both exports present.

```bash
# Track 8 feed-me route exists
ls /Users/ravishah/Documents/whattoeat/src/app/\(authenticated\)/feed-me/page.tsx
```

Expected: file found.

#### Step 1.2 — Create worktree and branch

```bash
bash /Users/ravishah/Documents/whattoeat/scripts/wt.sh track-10-home-onboarding
```

Expected output: a new git worktree at `/Users/ravishah/Documents/whattoeat-track-10-home-onboarding` checked out on branch `wt/track-10-home-onboarding` from the current `main` HEAD.

#### Step 1.3 — Baseline typecheck

```bash
cd /Users/ravishah/Documents/whattoeat-track-10-home-onboarding && bun run typecheck
```

Expected: exit 0. If it fails, fix inherited type errors before proceeding — they are not this track's fault, but they will compound if ignored.

#### Step 1.4 — Confirm no new runtime deps are needed

Review the tech-stack list at the top of this plan. Every package listed — `@supabase/ssr`, `zod`, `lucide-react`, `class-variance-authority`, `tailwind-merge`, `clsx`, `vaul` — should already appear in `package.json` from Tracks 0-8.

```bash
grep -E '"(lucide-react|vaul|sonner|clsx|tailwind-merge|class-variance-authority)"' \
  /Users/ravishah/Documents/whattoeat-track-10-home-onboarding/package.json
```

If any are missing, add them with `bun add <pkg>` and commit `package.json` + `bun.lock` as the very first commit on this branch before Task 2.

#### Acceptance

- [ ] All upstream file checks exit 0.
- [ ] Worktree exists on `wt/track-10-home-onboarding`.
- [ ] Baseline typecheck passes.
- [ ] `package.json` contains every required runtime dependency.

---

### Task 2: Onboarding redirect logic

**Files created:**
- `src/lib/onboarding/redirect.ts`
- `src/lib/onboarding/steps.ts`
- `src/lib/onboarding/index.ts`

**Commit prefix:** `onboarding:`

This task writes the pure business logic that answers two questions: "does this user need to go through onboarding?" and "which step should they land on?" Both functions are pure — they receive data, return values, never call the database or redirect themselves. That makes them trivially testable (Task 11 tests them exhaustively) and safe to call from middleware (which runs on the edge where I/O is constrained).

#### Step 2.1 — Write `src/lib/onboarding/steps.ts`

This file defines the canonical step list and per-step metadata. Each step has a number, a route segment, a title for the stepper UI, and a predicate that determines whether that step has been completed given a (possibly partial) profile object.

```typescript
// src/lib/onboarding/steps.ts
// Canonical onboarding step registry.
// Import from '@/lib/onboarding' — do not import this file directly in pages.

import type { Profile } from "@/contracts/zod/profile";

export interface OnboardingStepMeta {
  /** 1-indexed step number, matches [step] URL param */
  step: number;
  /** Route segment: /onboarding/step/[step] */
  segment: string;
  /** Short title shown in the OnboardingStepper progress bar */
  title: string;
  /** Short description shown below the step title */
  description: string;
  /** Returns true when this step's data is present on the profile */
  isComplete: (profile: Partial<Profile> | null) => boolean;
}

export const ONBOARDING_STEPS: readonly OnboardingStepMeta[] = [
  {
    step: 1,
    segment: "1",
    title: "Your Goal",
    description: "Tell us what you want to achieve.",
    isComplete: (p) => !!p?.goal,
  },
  {
    step: 2,
    segment: "2",
    title: "Body Data",
    description: "We use this to calculate your targets.",
    isComplete: (p) =>
      !!p?.height_cm && !!p?.weight_kg && !!p?.birthdate && !!p?.sex && !!p?.activity_level,
  },
  {
    step: 3,
    segment: "3",
    title: "Your Targets",
    description: "Review and adjust your macro targets.",
    // step 3 is complete once target_kcal is non-zero (the auth trigger sets it to 0 as the
    // "onboarding required" sentinel; computeTargets always produces a positive value)
    isComplete: (p) => typeof p?.target_kcal === "number" && p.target_kcal > 0,
  },
  {
    step: 4,
    segment: "4",
    title: "Allergens",
    description: "Flag anything we should always avoid.",
    // allergens is optional content — presence of an empty array means the user consciously
    // confirmed they have none. null means they never visited the step.
    isComplete: (p) => Array.isArray(p?.allergens),
  },
  {
    step: 5,
    segment: "5",
    title: "Pantry",
    description: "Seed your pantry (you can skip this).",
    // step 5 is always considered complete once the user has visited it — it is explicitly
    // skip-able and its completion is tracked via the onboarding_completed_at timestamp.
    isComplete: (p) => !!p?.onboarding_completed_at,
  },
] as const;

export const ONBOARDING_TOTAL_STEPS = ONBOARDING_STEPS.length;

/**
 * Returns the first incomplete step for a given profile, or null if all steps are done.
 * Used by the onboarding redirect logic and the stepper component.
 */
export function firstIncompleteStep(
  profile: Partial<Profile> | null,
): OnboardingStepMeta | null {
  return ONBOARDING_STEPS.find((s) => !s.isComplete(profile)) ?? null;
}

/**
 * Returns true if all onboarding steps are complete for the given profile.
 */
export function isOnboardingComplete(profile: Partial<Profile> | null): boolean {
  return ONBOARDING_STEPS.every((s) => s.isComplete(profile));
}
```

#### Step 2.2 — Write `src/lib/onboarding/redirect.ts`

This file exports the single function that the middleware calls. It receives a partial profile (already fetched by the middleware Supabase client) and the current pathname, and returns either a redirect URL string or `null` (meaning "let the request through").

```typescript
// src/lib/onboarding/redirect.ts
// Pure redirect logic — no I/O, no Next.js imports, safe to call from edge middleware.

import type { Profile } from "@/contracts/zod/profile";
import { firstIncompleteStep, isOnboardingComplete } from "./steps";

/**
 * Determines whether the current request should be redirected to the onboarding flow.
 *
 * @param profile      The user's current profile row, or null if it does not exist yet.
 * @param pathname     The pathname of the incoming request (e.g. "/home").
 * @returns            A redirect pathname (e.g. "/onboarding/step/1") or null.
 *
 * Rules:
 *  - If the profile is null, redirect to step 1 (the auth trigger should have created it,
 *    but if it raced or failed we fail safe by sending the user through onboarding).
 *  - If onboarding is already complete, never redirect.
 *  - If the user is already on /onboarding/**, let them through unconditionally (prevents
 *    infinite redirect loop).
 *  - If the user is trying to reach an authenticated route that is not /onboarding/**,
 *    redirect them to their first incomplete step.
 */
export function onboardingRedirectPath(
  profile: Partial<Profile> | null,
  pathname: string,
): string | null {
  // Already on the onboarding wizard — never redirect (prevents loops).
  if (pathname.startsWith("/onboarding")) {
    return null;
  }

  // Profile missing entirely — send to step 1.
  if (!profile) {
    return "/onboarding/step/1";
  }

  // Onboarding already done — let through.
  if (isOnboardingComplete(profile)) {
    return null;
  }

  // Onboarding is in progress — find the first incomplete step.
  const next = firstIncompleteStep(profile);
  if (!next) return null; // shouldn't happen given the isOnboardingComplete guard above

  return `/onboarding/step/${next.segment}`;
}
```

#### Step 2.3 — Write `src/lib/onboarding/index.ts`

```typescript
// src/lib/onboarding/index.ts
export { onboardingRedirectPath } from "./redirect";
export {
  ONBOARDING_STEPS,
  ONBOARDING_TOTAL_STEPS,
  firstIncompleteStep,
  isOnboardingComplete,
  type OnboardingStepMeta,
} from "./steps";
```

#### Acceptance

- [ ] Three files created; `bun run typecheck` exits 0.
- [ ] `onboardingRedirectPath(null, "/home")` returns `"/onboarding/step/1"`.
- [ ] `onboardingRedirectPath({ target_kcal: 2000, allergens: [], onboarding_completed_at: new Date() }, "/home")` returns `null`.
- [ ] `onboardingRedirectPath({ goal: "lose" }, "/onboarding/step/2")` returns `null` (no loop).

---

### Task 3: Middleware surgical patch

**Files modified:** `src/middleware.ts` (one insertion block only)

**Commit prefix:** `onboarding:`

Track 4's middleware already refreshes the Supabase session cookie and guards `/(authenticated)/**`. This task adds exactly one block of logic: after the session refresh succeeds for an authenticated user targeting an `/(authenticated)/**` route, call `onboardingRedirectPath` and issue a `NextResponse.redirect` if the result is non-null.

The patch is deliberately minimal — fewer than 20 lines of new code. Do not restructure the existing middleware. Read it fully before touching it, identify the exact insertion point (after the `getUser()` call and before the `response` return), and make the smallest possible diff.

#### Step 3.1 — Read the current middleware

```bash
cat /Users/ravishah/Documents/whattoeat-track-10-home-onboarding/src/middleware.ts
```

Identify:
1. Where `supabase.auth.getUser()` is called and `user` is obtained.
2. Where authenticated routes are guarded (the `if (!user && isProtectedRoute)` block).
3. The final `return response` line.

#### Step 3.2 — Plan the patch location

The patch goes **after** the existing user-guard block and **before** the final `return response`. It should look like this in pseudocode:

```
// existing: if no user and protected route → redirect to /auth/login
// NEW BLOCK ↓
if (user && isProtectedRoute) {
  // Fetch the minimal profile needed for onboarding gate
  const { data: profile } = await supabase
    .from("profiles")
    .select("goal, height_cm, weight_kg, birthdate, sex, activity_level, target_kcal, allergens, onboarding_completed_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const redirectPath = onboardingRedirectPath(profile, request.nextUrl.pathname);
  if (redirectPath) {
    const url = request.nextUrl.clone();
    url.pathname = redirectPath;
    return NextResponse.redirect(url);
  }
}
// existing: return response
```

The `import { onboardingRedirectPath } from "@/lib/onboarding"` line goes at the top of the middleware file alongside the other imports.

#### Step 3.3 — Apply the patch

Edit `src/middleware.ts` using the Edit tool. Make two targeted edits:
1. Add the import at the top.
2. Insert the onboarding gate block at the identified location.

Do not change any other line in the file. After editing, verify the diff is clean:

```bash
git -C /Users/ravishah/Documents/whattoeat-track-10-home-onboarding diff src/middleware.ts
```

#### Step 3.4 — Typecheck

```bash
cd /Users/ravishah/Documents/whattoeat-track-10-home-onboarding && bun run typecheck
```

Expected: exit 0.

#### Acceptance

- [ ] `src/middleware.ts` diff is under 25 lines changed.
- [ ] New import for `onboardingRedirectPath` added at the top.
- [ ] Onboarding gate block inserted after user-guard, before `return response`.
- [ ] No existing middleware logic changed.
- [ ] `bun run typecheck` exits 0 after the patch.
- [ ] An authenticated user with `target_kcal = 0` hitting `/home` is redirected to `/onboarding/step/1` (verifiable by running the dev server with a seeded test user).

---

### Task 4: Onboarding layout + stepper component

**Files created:**
- `src/app/onboarding/layout.tsx`
- `src/app/onboarding/page.tsx`
- `src/components/feature/home/OnboardingStepper.tsx`
- `src/components/feature/home/OnboardingStepFrame.tsx`

**Commit prefix:** `onboarding:`

The onboarding layout wraps all five step pages with a consistent visual frame: the WhatToEat wordmark at the top, the `OnboardingStepper` progress bar beneath it, and a centered card area where each step's form renders. The layout is a Server Component — it fetches the current user's profile to determine step completion state for the stepper, then passes that data as props to `OnboardingStepper`.

`OnboardingStepFrame` is a Client Component that wraps each individual step's form. It provides the card container, the step title, the back button (links to the previous step), and the primary action button (submits the form). The actual form inputs live in each step's own component; `OnboardingStepFrame` is pure chrome.

#### Step 4.1 — Write `src/app/onboarding/layout.tsx`

This is a React Server Component (no `'use client'` directive). It calls `getUserId()` to determine the current user, fetches their profile with the Supabase server client, and renders the fixed header + stepper + `{children}` slot.

```typescript
// src/app/onboarding/layout.tsx
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getUserId } from "@/server/auth";
import { isOnboardingComplete, ONBOARDING_STEPS } from "@/lib/onboarding";
import { OnboardingStepper } from "@/components/feature/home/OnboardingStepper";

interface Props {
  children: React.ReactNode;
}

export default async function OnboardingLayout({ children }: Props) {
  const userId = await getUserId();

  // If somehow no session, push to login.
  if (!userId) {
    redirect("/auth/login");
  }

  const supabase = createServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "goal, height_cm, weight_kg, birthdate, sex, activity_level, target_kcal, allergens, onboarding_completed_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  // If onboarding is already complete, send to home.
  if (isOnboardingComplete(profile)) {
    redirect("/home");
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      {/* ── Header ── */}
      <header className="py-6 px-4 flex items-center justify-center border-b border-border">
        <span className="text-xl font-semibold tracking-tight text-foreground">
          WhatToEat
        </span>
      </header>

      {/* ── Stepper progress bar ── */}
      <div className="px-4 pt-8 pb-4 flex justify-center">
        <OnboardingStepper steps={ONBOARDING_STEPS} profile={profile} />
      </div>

      {/* ── Step content ── */}
      <main className="flex-1 flex items-start justify-center px-4 pb-16">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
```

#### Step 4.2 — Write `src/app/onboarding/page.tsx`

The root `/onboarding` URL simply redirects to step 1. This prevents the layout from needing to handle the case of no step param.

```typescript
// src/app/onboarding/page.tsx
import { redirect } from "next/navigation";

export default function OnboardingRoot() {
  redirect("/onboarding/step/1");
}
```

#### Step 4.3 — Write `src/components/feature/home/OnboardingStepper.tsx`

The stepper is a pure presentational Client Component. It receives the step metadata and the current profile, computes completion state for each step, and renders a horizontal row of numbered circles connected by thin lines. Completed steps show a checkmark. The active step is highlighted with the brand accent color. Future steps are muted.

```typescript
// src/components/feature/home/OnboardingStepper.tsx
"use client";

import { CheckIcon } from "lucide-react";
import { cn } from "@/components/ui/utils";
import type { OnboardingStepMeta } from "@/lib/onboarding";
import type { Profile } from "@/contracts/zod/profile";

interface OnboardingStepperProps {
  steps: readonly OnboardingStepMeta[];
  profile: Partial<Profile> | null;
  /** The currently active step number (1-indexed). Derived from URL if not passed. */
  activeStep?: number;
}

export function OnboardingStepper({
  steps,
  profile,
  activeStep,
}: OnboardingStepperProps) {
  return (
    <nav aria-label="Onboarding progress" className="w-full max-w-md">
      <ol className="flex items-center gap-0">
        {steps.map((s, idx) => {
          const complete = s.isComplete(profile);
          const active = s.step === activeStep;
          const isLast = idx === steps.length - 1;

          return (
            <li key={s.step} className="flex items-center flex-1 last:flex-none">
              {/* Circle */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors duration-200",
                    complete &&
                      "bg-accent border-accent text-accent-foreground",
                    active &&
                      !complete &&
                      "border-accent text-accent bg-background",
                    !complete &&
                      !active &&
                      "border-border text-muted-foreground bg-background",
                  )}
                  aria-current={active ? "step" : undefined}
                >
                  {complete ? (
                    <CheckIcon className="w-4 h-4" strokeWidth={2.5} />
                  ) : (
                    <span>{s.step}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium hidden sm:block",
                    complete || active
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {s.title}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 rounded-full transition-colors duration-200",
                    complete ? "bg-accent" : "bg-border",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
```

#### Step 4.4 — Write `src/components/feature/home/OnboardingStepFrame.tsx`

Each step's content is wrapped in this card shell. It receives the step number (for back navigation), the step title, a subtitle, and children (the form body).

```typescript
// src/components/feature/home/OnboardingStepFrame.tsx
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { Separator } from "@/components/ui/separator";

interface OnboardingStepFrameProps {
  step: number;
  totalSteps: number;
  title: string;
  description: string;
  children: React.ReactNode;
  /** If false, the back button is hidden (used on step 1) */
  showBack?: boolean;
}

export function OnboardingStepFrame({
  step,
  totalSteps,
  title,
  description,
  children,
  showBack = true,
}: OnboardingStepFrameProps) {
  const prevStep = step - 1;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm px-6 py-8 mt-4">
      {/* Back navigation */}
      {showBack && step > 1 && (
        <Link
          href={`/onboarding/step/${prevStep}`}
          className={cn(
            "inline-flex items-center gap-1.5 text-sm text-muted-foreground",
            "hover:text-foreground transition-colors mb-6",
          )}
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          Back
        </Link>
      )}

      {/* Step header */}
      <div className="mb-6">
        <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-widest">
          Step {step} of {totalSteps}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <Separator className="mb-6" />

      {/* Step body (form content) */}
      {children}
    </div>
  );
}
```

#### Acceptance

- [ ] Four files created; `bun run typecheck` exits 0.
- [ ] `OnboardingStepper` renders completed steps with a checkmark, active step with accent border, future steps muted — visually verifiable at `/preview` if storybook page is used.
- [ ] `OnboardingStepFrame` shows back link only when `step > 1`.
- [ ] Layout redirects to `/home` when `isOnboardingComplete(profile)` is true.
- [ ] Layout redirects to `/auth/login` when there is no session.

---

### Task 5: Onboarding steps 1–3 (goal, body data, confirm targets)

**Files created:**
- `src/app/onboarding/step/[step]/page.tsx`
- `src/app/onboarding/step/[step]/actions.ts`
- `src/components/feature/home/GoalStep.tsx`
- `src/components/feature/home/BodyDataStep.tsx`
- `src/components/feature/home/ConfirmTargetsStep.tsx`

**Commit prefix:** `onboarding:`

The dynamic `[step]` page RSC reads the `step` param, validates it (1–5), fetches the current user's profile, and renders the appropriate step component. Each step component is a self-contained form that submits to a step-specific server action. The server action validates input, writes to the profile via `upsertProfile`, and then calls `redirect` to the next step.

#### Step 5.1 — Write `src/app/onboarding/step/[step]/page.tsx`

```typescript
// src/app/onboarding/step/[step]/page.tsx
import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { ONBOARDING_STEPS, ONBOARDING_TOTAL_STEPS } from "@/lib/onboarding";
import { OnboardingStepFrame } from "@/components/feature/home/OnboardingStepFrame";
import { GoalStep } from "@/components/feature/home/GoalStep";
import { BodyDataStep } from "@/components/feature/home/BodyDataStep";
import { ConfirmTargetsStep } from "@/components/feature/home/ConfirmTargetsStep";
import { AllergensStep } from "@/components/feature/home/AllergensStep";
import { PantrySeedStep } from "@/components/feature/home/PantrySeedStep";

interface Props {
  params: Promise<{ step: string }>;
}

export default async function OnboardingStepPage({ params }: Props) {
  const { step: stepParam } = await params;
  const stepNum = parseInt(stepParam, 10);

  if (isNaN(stepNum) || stepNum < 1 || stepNum > ONBOARDING_TOTAL_STEPS) {
    notFound();
  }

  const { userId } = await requireUser();
  const supabase = createServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const stepMeta = ONBOARDING_STEPS[stepNum - 1];
  if (!stepMeta) notFound();

  // Guard: if a previous step is not complete, redirect back to that step.
  // This prevents deep-linking into the middle of onboarding without completing prior steps.
  for (const s of ONBOARDING_STEPS) {
    if (s.step >= stepNum) break;
    if (!s.isComplete(profile)) {
      redirect(`/onboarding/step/${s.segment}`);
    }
  }

  const stepContent = (() => {
    switch (stepNum) {
      case 1:
        return <GoalStep profile={profile} />;
      case 2:
        return <BodyDataStep profile={profile} />;
      case 3:
        return <ConfirmTargetsStep profile={profile} />;
      case 4:
        return <AllergensStep profile={profile} />;
      case 5:
        return <PantrySeedStep userId={userId} />;
      default:
        notFound();
    }
  })();

  return (
    <OnboardingStepFrame
      step={stepNum}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title={stepMeta.title}
      description={stepMeta.description}
      showBack={stepNum > 1}
    >
      {stepContent}
    </OnboardingStepFrame>
  );
}

export function generateStaticParams() {
  return ONBOARDING_STEPS.map((s) => ({ step: s.segment }));
}
```

#### Step 5.2 — Write `src/app/onboarding/step/[step]/actions.ts`

This file collects all five step server actions. Each action is a `'use server'` function that accepts `FormData`, validates the payload with Zod, calls `upsertProfile`, and redirects to the next step (or to `/home` on the final step).

```typescript
// src/app/onboarding/step/[step]/actions.ts
"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { upsertProfile } from "@/server/profile";
import { computeTargets } from "@/lib/macros";
import type { ActionResult } from "@/server/contracts";

// ── Step 1: Goal ────────────────────────────────────────────────────────────

const GoalSchema = z.object({
  goal: z.enum(["lose", "maintain", "gain", "performance"]),
});

export async function submitGoalStep(
  _prev: ActionResult<void>,
  formData: FormData,
): Promise<ActionResult<void>> {
  const { userId } = await requireUser();
  const parsed = GoalSchema.safeParse({ goal: formData.get("goal") });

  if (!parsed.success) {
    return { ok: false, error: "Please select a goal to continue." };
  }

  const supabase = createServerClient();
  await upsertProfile(supabase, userId, { goal: parsed.data.goal });

  redirect("/onboarding/step/2");
}

// ── Step 2: Body data ────────────────────────────────────────────────────────

const BodyDataSchema = z.object({
  height_cm: z.coerce.number().min(100).max(250),
  weight_kg: z.coerce.number().min(30).max(300),
  birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter date as YYYY-MM-DD"),
  sex: z.enum(["male", "female"]),
  activity_level: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
});

export async function submitBodyDataStep(
  _prev: ActionResult<void>,
  formData: FormData,
): Promise<ActionResult<void>> {
  const { userId } = await requireUser();

  const raw = {
    height_cm: formData.get("height_cm"),
    weight_kg: formData.get("weight_kg"),
    birthdate: formData.get("birthdate"),
    sex: formData.get("sex"),
    activity_level: formData.get("activity_level"),
  };

  const parsed = BodyDataSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return { ok: false, error: first?.message ?? "Please check your inputs." };
  }

  const supabase = createServerClient();
  await upsertProfile(supabase, userId, parsed.data);

  redirect("/onboarding/step/3");
}

// ── Step 3: Confirm targets ──────────────────────────────────────────────────

const ConfirmTargetsSchema = z.object({
  target_kcal: z.coerce.number().min(800).max(10000),
  target_protein_g: z.coerce.number().min(10).max(500),
  target_carbs_g: z.coerce.number().min(0).max(800),
  target_fat_g: z.coerce.number().min(10).max(500),
});

export async function submitConfirmTargetsStep(
  _prev: ActionResult<void>,
  formData: FormData,
): Promise<ActionResult<void>> {
  const { userId } = await requireUser();

  const raw = {
    target_kcal: formData.get("target_kcal"),
    target_protein_g: formData.get("target_protein_g"),
    target_carbs_g: formData.get("target_carbs_g"),
    target_fat_g: formData.get("target_fat_g"),
  };

  const parsed = ConfirmTargetsSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return { ok: false, error: first?.message ?? "Please check your targets." };
  }

  const supabase = createServerClient();
  await upsertProfile(supabase, userId, parsed.data);

  redirect("/onboarding/step/4");
}
```

#### Step 5.3 — Write `src/components/feature/home/GoalStep.tsx`

Step 1 renders four goal cards: Lose weight, Maintain, Build muscle, Peak performance. The user taps one and a hidden input is set, then they submit the form. The UI uses large tap-target cards with icons for accessibility and delight.

```typescript
// src/components/feature/home/GoalStep.tsx
"use client";

import { useActionState } from "react";
import { cn } from "@/components/ui/utils";
import { Button } from "@/components/ui/button";
import { submitGoalStep } from "@/app/onboarding/step/[step]/actions";
import type { Profile } from "@/contracts/zod/profile";

const GOALS = [
  {
    value: "lose",
    label: "Lose weight",
    emoji: "🔥",
    description: "Create a calorie deficit to shed fat while preserving muscle.",
  },
  {
    value: "maintain",
    label: "Stay balanced",
    emoji: "⚖️",
    description: "Eat at maintenance and feel consistently energized.",
  },
  {
    value: "gain",
    label: "Build muscle",
    emoji: "💪",
    description: "Eat at a surplus to fuel strength and muscle growth.",
  },
  {
    value: "performance",
    label: "Peak performance",
    emoji: "🏆",
    description: "Optimize nutrition for athletic output and recovery.",
  },
] as const;

interface GoalStepProps {
  profile: Partial<Profile> | null;
}

export function GoalStep({ profile }: GoalStepProps) {
  const initialState = { ok: true as const };
  const [state, formAction, pending] = useActionState(submitGoalStep, initialState);
  const [selected, setSelected] = React.useState<string>(profile?.goal ?? "");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="goal" value={selected} />

      <div className="grid grid-cols-1 gap-3">
        {GOALS.map((g) => (
          <button
            key={g.value}
            type="button"
            onClick={() => setSelected(g.value)}
            className={cn(
              "w-full text-left rounded-xl border-2 px-4 py-3.5 transition-all duration-150",
              "flex items-start gap-3 cursor-pointer",
              selected === g.value
                ? "border-accent bg-accent/5"
                : "border-border bg-card hover:border-accent/50",
            )}
          >
            <span className="text-2xl leading-none mt-0.5">{g.emoji}</span>
            <div>
              <p className="font-semibold text-foreground text-sm">{g.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{g.description}</p>
            </div>
          </button>
        ))}
      </div>

      {!state.ok && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button
        type="submit"
        disabled={!selected || pending}
        className="w-full mt-6"
      >
        {pending ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}
```

Note: add `import React from "react"` at the top (for `useState`). The import is intentionally placed before the function body in the real file.

#### Step 5.4 — Write `src/components/feature/home/BodyDataStep.tsx`

Step 2 collects height, weight, birthdate, sex, and activity level. Each field uses the `Input` and `Label` primitives from Track 1. Sex and activity level use `SegmentedControl`. The form shows the current profile values as default values so re-visiting the step pre-fills the form.

```typescript
// src/components/feature/home/BodyDataStep.tsx
"use client";

import React from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { submitBodyDataStep } from "@/app/onboarding/step/[step]/actions";
import type { Profile } from "@/contracts/zod/profile";

const ACTIVITY_OPTIONS = [
  { value: "sedentary", label: "Sedentary" },
  { value: "light", label: "Light" },
  { value: "moderate", label: "Moderate" },
  { value: "active", label: "Active" },
  { value: "very_active", label: "Very active" },
];

interface BodyDataStepProps {
  profile: Partial<Profile> | null;
}

export function BodyDataStep({ profile }: BodyDataStepProps) {
  const initialState = { ok: true as const };
  const [state, formAction, pending] = useActionState(submitBodyDataStep, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {/* Height */}
      <div className="space-y-1.5">
        <Label htmlFor="height_cm">Height (cm)</Label>
        <Input
          id="height_cm"
          name="height_cm"
          type="number"
          min={100}
          max={250}
          step={1}
          placeholder="e.g. 175"
          defaultValue={profile?.height_cm ?? ""}
          required
        />
      </div>

      {/* Weight */}
      <div className="space-y-1.5">
        <Label htmlFor="weight_kg">Weight (kg)</Label>
        <Input
          id="weight_kg"
          name="weight_kg"
          type="number"
          min={30}
          max={300}
          step={0.1}
          placeholder="e.g. 72.5"
          defaultValue={profile?.weight_kg ?? ""}
          required
        />
      </div>

      {/* Birthdate */}
      <div className="space-y-1.5">
        <Label htmlFor="birthdate">Date of birth</Label>
        <Input
          id="birthdate"
          name="birthdate"
          type="date"
          defaultValue={profile?.birthdate ?? ""}
          required
        />
      </div>

      {/* Sex */}
      <div className="space-y-1.5">
        <Label>Biological sex</Label>
        <SegmentedControl
          name="sex"
          options={[
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
          ]}
          defaultValue={profile?.sex ?? "male"}
        />
      </div>

      {/* Activity level */}
      <div className="space-y-1.5">
        <Label>Activity level</Label>
        <SegmentedControl
          name="activity_level"
          options={ACTIVITY_OPTIONS}
          defaultValue={profile?.activity_level ?? "moderate"}
          className="flex-wrap"
        />
      </div>

      {!state.ok && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" disabled={pending} className="w-full mt-2">
        {pending ? "Saving…" : "Calculate my targets"}
      </Button>
    </form>
  );
}
```

#### Step 5.5 — Write `src/components/feature/home/ConfirmTargetsStep.tsx`

Step 3 calls `computeTargets` with the profile data filled in step 2, shows the computed macro targets in a read-only summary ring, and lets the user override individual fields before confirming. The ring is the `HomeMacroRing` component from Task 9 — import it as a forward reference and stub it if Task 9 has not landed yet.

```typescript
// src/components/feature/home/ConfirmTargetsStep.tsx
"use client";

import React from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitConfirmTargetsStep } from "@/app/onboarding/step/[step]/actions";
import { computeTargets } from "@/lib/macros";
import type { Profile } from "@/contracts/zod/profile";

interface ConfirmTargetsStepProps {
  profile: Partial<Profile> | null;
}

export function ConfirmTargetsStep({ profile }: ConfirmTargetsStepProps) {
  const initialState = { ok: true as const };
  const [state, formAction, pending] = useActionState(
    submitConfirmTargetsStep,
    initialState,
  );

  // Compute server-suggested targets from biometric data.
  const suggested = profile ? computeTargets(profile as Parameters<typeof computeTargets>[0]) : null;

  const defaults = {
    target_kcal: profile?.target_kcal && profile.target_kcal > 0
      ? profile.target_kcal
      : suggested?.kcal ?? 2000,
    target_protein_g: profile?.target_protein_g ?? suggested?.protein_g ?? 150,
    target_carbs_g: profile?.target_carbs_g ?? suggested?.carbs_g ?? 200,
    target_fat_g: profile?.target_fat_g ?? suggested?.fat_g ?? 65,
  };

  return (
    <form action={formAction} className="space-y-5">
      <div className="rounded-xl bg-muted/50 border border-border px-4 py-3 text-sm text-muted-foreground">
        These are your AI-suggested targets based on your body data and goal.
        You can adjust them below — or leave them as-is and refine later in Profile settings.
      </div>

      {/* Calorie target */}
      <div className="space-y-1.5">
        <Label htmlFor="target_kcal">Daily calories (kcal)</Label>
        <Input
          id="target_kcal"
          name="target_kcal"
          type="number"
          min={800}
          max={10000}
          step={50}
          defaultValue={defaults.target_kcal}
          required
        />
      </div>

      {/* Protein */}
      <div className="space-y-1.5">
        <Label htmlFor="target_protein_g">Protein (g)</Label>
        <Input
          id="target_protein_g"
          name="target_protein_g"
          type="number"
          min={10}
          max={500}
          step={5}
          defaultValue={defaults.target_protein_g}
          required
        />
      </div>

      {/* Carbs */}
      <div className="space-y-1.5">
        <Label htmlFor="target_carbs_g">Carbohydrates (g)</Label>
        <Input
          id="target_carbs_g"
          name="target_carbs_g"
          type="number"
          min={0}
          max={800}
          step={5}
          defaultValue={defaults.target_carbs_g}
          required
        />
      </div>

      {/* Fat */}
      <div className="space-y-1.5">
        <Label htmlFor="target_fat_g">Fat (g)</Label>
        <Input
          id="target_fat_g"
          name="target_fat_g"
          type="number"
          min={10}
          max={500}
          step={5}
          defaultValue={defaults.target_fat_g}
          required
        />
      </div>

      {!state.ok && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" disabled={pending} className="w-full mt-2">
        {pending ? "Saving…" : "These look right"}
      </Button>
    </form>
  );
}
```

#### Acceptance

- [ ] Five files created; `bun run typecheck` exits 0.
- [ ] Navigating to `/onboarding/step/1` renders goal cards; selecting one and submitting writes the profile row and redirects to `/onboarding/step/2`.
- [ ] Attempting to navigate directly to `/onboarding/step/3` without completing steps 1 and 2 redirects back to `/onboarding/step/1`.
- [ ] `submitGoalStep` returns `{ ok: false, error: "..." }` when no goal is submitted.
- [ ] `submitBodyDataStep` returns `{ ok: false, error: "..." }` when a required field is missing.
- [ ] `submitConfirmTargetsStep` writes `target_kcal > 0` to the profile, unblocking the middleware gate.

---

### Task 6: Onboarding steps 4–5 (allergens + pantry seed)

**Files created:**
- `src/components/feature/home/AllergensStep.tsx`
- `src/components/feature/home/PantrySeedStep.tsx`
- (additions to `src/app/onboarding/step/[step]/actions.ts`)

**Commit prefix:** `onboarding:`

Step 4 is the allergen multi-select. Step 5 is the optional pantry seed. Both steps are important for the first-run experience: allergens feed directly into the recommendation engine's safety filter, and a seeded pantry makes the first Feed Me result dramatically more relevant. Both steps are skip-able in the sense that the user can submit them empty — the key is that submitting (even with an empty selection) marks the step as complete by writing `allergens: []` or setting `onboarding_completed_at`.

#### Step 6.1 — Add step 4 and step 5 actions to `actions.ts`

Append the following two action functions to `src/app/onboarding/step/[step]/actions.ts`. They follow the same `'use server'` + Zod + `upsertProfile` + `redirect` pattern as steps 1-3.

```typescript
// ── Step 4: Allergens ───────────────────────────────────────────────────────

const AllergensSchema = z.object({
  // FormData multi-value field; .getAll() returns string[]
  allergens: z.array(z.string()).default([]),
});

export async function submitAllergensStep(
  _prev: ActionResult<void>,
  formData: FormData,
): Promise<ActionResult<void>> {
  const { userId } = await requireUser();

  const allergens = formData.getAll("allergens") as string[];
  const parsed = AllergensSchema.safeParse({ allergens });

  if (!parsed.success) {
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  const supabase = createServerClient();
  // Writing an array (even empty) marks step 4 as complete per the isComplete predicate.
  await upsertProfile(supabase, userId, { allergens: parsed.data.allergens });

  redirect("/onboarding/step/5");
}

// ── Step 5: Pantry seed ─────────────────────────────────────────────────────

const PantrySeedSchema = z.object({
  // Free-text comma-separated list; we split on the server side.
  pantry_text: z.string().max(2000).default(""),
});

export async function submitPantrySeedStep(
  _prev: ActionResult<void>,
  formData: FormData,
): Promise<ActionResult<void>> {
  const { userId } = await requireUser();

  const raw = { pantry_text: formData.get("pantry_text") ?? "" };
  const parsed = PantrySeedSchema.safeParse(raw);

  if (!parsed.success) {
    return { ok: false, error: "Input too long. Keep it under 2000 characters." };
  }

  const supabase = createServerClient();

  // Parse comma-separated ingredient names into individual pantry items.
  const names = parsed.data.pantry_text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (names.length > 0) {
    // Bulk-insert via the pantry bulkAdd action from Track 5.
    // We import bulkAddPantryItems from src/server/pantry — Track 5 must be merged.
    const { bulkAddPantryItems } = await import("@/server/pantry");
    await bulkAddPantryItems(supabase, userId, names);
  }

  // Mark onboarding complete by setting the timestamp.
  await upsertProfile(supabase, userId, {
    onboarding_completed_at: new Date().toISOString(),
  });

  // Redirect to home — onboarding is done!
  redirect("/home");
}
```

#### Step 6.2 — Write `src/components/feature/home/AllergensStep.tsx`

Step 4 renders a multi-select chip grid of common allergens. The user taps chips to toggle them on/off. Each selected chip adds a hidden `<input name="allergens" value="...">` to the form. A "None" option is also available — selecting it deselects all others and submits an empty array.

```typescript
// src/components/feature/home/AllergensStep.tsx
"use client";

import React, { useState } from "react";
import { useActionState } from "react";
import { cn } from "@/components/ui/utils";
import { Button } from "@/components/ui/button";
import { submitAllergensStep } from "@/app/onboarding/step/[step]/actions";
import type { Profile } from "@/contracts/zod/profile";

const COMMON_ALLERGENS = [
  { value: "gluten", label: "Gluten" },
  { value: "dairy", label: "Dairy" },
  { value: "eggs", label: "Eggs" },
  { value: "fish", label: "Fish" },
  { value: "shellfish", label: "Shellfish" },
  { value: "tree_nuts", label: "Tree Nuts" },
  { value: "peanuts", label: "Peanuts" },
  { value: "soy", label: "Soy" },
  { value: "sesame", label: "Sesame" },
  { value: "wheat", label: "Wheat" },
  { value: "sulfites", label: "Sulfites" },
] as const;

interface AllergensStepProps {
  profile: Partial<Profile> | null;
}

export function AllergensStep({ profile }: AllergensStepProps) {
  const initialState = { ok: true as const };
  const [state, formAction, pending] = useActionState(submitAllergensStep, initialState);

  const initialSelected = new Set<string>(
    // If allergens is already an array (re-visiting step), pre-populate.
    Array.isArray(profile?.allergens) ? (profile.allergens as string[]) : [],
  );
  const [selected, setSelected] = useState<Set<string>>(initialSelected);

  const toggle = (value: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

  return (
    <form action={formAction} className="space-y-5">
      <p className="text-sm text-muted-foreground">
        We will never suggest a meal that contains an ingredient you flag here.
        You can add more in Profile settings at any time.
      </p>

      {/* Hidden inputs for each selected allergen */}
      {Array.from(selected).map((a) => (
        <input key={a} type="hidden" name="allergens" value={a} />
      ))}

      {/* Chip grid */}
      <div className="flex flex-wrap gap-2">
        {COMMON_ALLERGENS.map((a) => (
          <button
            key={a.value}
            type="button"
            onClick={() => toggle(a.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors duration-150",
              selected.has(a.value)
                ? "border-destructive bg-destructive/10 text-destructive"
                : "border-border bg-card text-foreground hover:border-border/70",
            )}
          >
            {a.label}
          </button>
        ))}
      </div>

      {!state.ok && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex gap-3 mt-6">
        <Button
          type="submit"
          variant="outline"
          className="flex-1"
          disabled={pending}
          formAction={formAction}
          onClick={() => setSelected(new Set())}
        >
          I have none
        </Button>
        <Button type="submit" className="flex-1" disabled={pending}>
          {pending ? "Saving…" : selected.size > 0 ? `Flag ${selected.size}` : "Continue"}
        </Button>
      </div>
    </form>
  );
}
```

#### Step 6.3 — Write `src/components/feature/home/PantrySeedStep.tsx`

Step 5 offers a single large textarea where the user can type or paste a comma-separated list of pantry items they currently have at home. The prompt copy is warm and encouraging — this is the last step before the payoff, so the language should build anticipation for the first Feed Me result. The step is explicitly skippable.

```typescript
// src/components/feature/home/PantrySeedStep.tsx
"use client";

import React from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { submitPantrySeedStep } from "@/app/onboarding/step/[step]/actions";

interface PantrySeedStepProps {
  /** userId is passed for display/logging but the action derives it independently */
  userId: string;
}

export function PantrySeedStep({ userId: _userId }: PantrySeedStepProps) {
  const initialState = { ok: true as const };
  const [state, formAction, pending] = useActionState(submitPantrySeedStep, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="rounded-xl bg-accent/5 border border-accent/20 px-4 py-3 text-sm text-foreground">
        <p className="font-semibold mb-0.5">Almost there — your first meal awaits.</p>
        <p className="text-muted-foreground">
          Tell us what is in your kitchen and we will suggest something you can
          actually make tonight. Paste a comma-separated list or type a few ingredients.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pantry_text">What&apos;s in your kitchen?</Label>
        <textarea
          id="pantry_text"
          name="pantry_text"
          rows={5}
          placeholder="chicken breast, olive oil, garlic, canned tomatoes, pasta, onion, eggs…"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm
                     placeholder:text-muted-foreground focus-visible:outline-none
                     focus-visible:ring-2 focus-visible:ring-ring resize-none"
          maxLength={2000}
        />
        <p className="text-xs text-muted-foreground">
          Separate items with commas. You can always add more from the Pantry tab.
        </p>
      </div>

      {!state.ok && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex gap-3 mt-4">
        <Button
          type="submit"
          variant="outline"
          className="flex-1"
          disabled={pending}
          // Skip: submit with empty textarea — action still marks onboarding complete.
          onClick={(e) => {
            const textarea = e.currentTarget
              .closest("form")
              ?.querySelector<HTMLTextAreaElement>("#pantry_text");
            if (textarea) textarea.value = "";
          }}
        >
          Skip for now
        </Button>
        <Button type="submit" className="flex-1" disabled={pending}>
          {pending ? "Saving…" : "Let's eat!"}
        </Button>
      </div>
    </form>
  );
}
```

#### Acceptance

- [ ] Both step components render correctly; `bun run typecheck` exits 0.
- [ ] Submitting step 4 with no allergens selected still writes `allergens: []` to the profile and redirects to step 5.
- [ ] Submitting step 4 with selected allergens writes them to the profile array.
- [ ] "I have none" button clears the selection and submits in one tap.
- [ ] Submitting step 5 with text content calls `bulkAddPantryItems` and sets `onboarding_completed_at`.
- [ ] "Skip for now" submits an empty pantry text but still sets `onboarding_completed_at` and redirects to `/home`.
- [ ] After step 5 completes, the middleware gate (`needsOnboarding` check in Task 2/3) lets the user through to `/home`.

---

### Task 7: Public landing page

**Files created:**
- `src/app/(public)/layout.tsx`
- `src/app/(public)/page.tsx`

**Commit prefix:** `home:`

The public landing page is the first thing a visitor sees when they arrive at `https://whattoeat.app/` without an active session. It is a pure Server Component — no client-side JavaScript beyond what Next.js injects automatically. The middleware (Track 4) already skips auth enforcement for routes that are not under `/(authenticated)/**`, so this page renders without any session check.

The design is minimal and confident: a full-viewport animated gradient hero, the wordmark, a single punchy headline, a two-line subheading, and a magic-link CTA button. The gradient animation is done entirely in CSS (a `@keyframes` rule in `src/app/globals.css`) so it degrades gracefully and adds zero JS bundle weight.

#### Step 7.1 — Write `src/app/(public)/layout.tsx`

The public layout is thinner than the app layout — no nav, no sidebar, just a root `<html>` and `<body>` that applies the background token.

```typescript
// src/app/(public)/layout.tsx
// Thin shell for all public (unauthenticated) routes.
// The main src/app/layout.tsx is the global root; this layout is nested within it.

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

Note: if `src/app/layout.tsx` (the global root layout from Track 1) already provides `<html>` and `<body>`, this layout does not need to replicate them — it is a segment layout, not a root layout.

#### Step 7.2 — Write `src/app/(public)/page.tsx`

```typescript
// src/app/(public)/page.tsx
// Public landing — rendered without auth gate, visible to the whole world.
// Server Component: no 'use client'. No data fetching needed.

import Link from "next/link";
import { ArrowRightIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="relative min-h-dvh flex flex-col items-center justify-center overflow-hidden">
      {/* ── Animated gradient background ── */}
      {/*
        The gradient uses CSS custom properties from tokens.css so it respects
        the light/dark token swap. The animation class "animate-gradient-shift"
        must be defined in src/app/globals.css as a @keyframes rule that shifts
        the background-position of a conic/linear gradient across the viewport.
        See Step 7.3 for the CSS.
      */}
      <div
        className="absolute inset-0 -z-10 animate-gradient-shift"
        aria-hidden="true"
        style={{
          background:
            "linear-gradient(135deg, var(--background) 0%, var(--accent)/8% 40%, var(--background) 70%, var(--muted)/30% 100%)",
          backgroundSize: "400% 400%",
        }}
      />

      {/* ── Wordmark ── */}
      <header className="absolute top-6 left-1/2 -translate-x-1/2">
        <span className="text-lg font-semibold tracking-tight text-foreground">
          WhatToEat
        </span>
      </header>

      {/* ── Hero content ── */}
      <main className="flex flex-col items-center text-center px-6 gap-6 max-w-lg">
        {/* Eyebrow chip */}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-xs font-medium text-accent">
          <SparklesIcon className="w-3 h-3" />
          AI-powered meal planning
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground leading-tight">
          Stop asking
          <br />
          <span className="text-accent">what to eat.</span>
        </h1>

        {/* Subheading */}
        <p className="text-base sm:text-lg text-muted-foreground max-w-sm leading-relaxed">
          WhatToEat learns your pantry, your macros, and your cravings — then
          gives you one perfect meal idea in seconds.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-none sm:w-auto">
          <Button asChild size="lg" className="gap-2 text-base sm:px-8">
            <Link href="/auth/login">
              Get started free
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="text-base sm:px-8">
            <Link href="/auth/login">Sign in</Link>
          </Button>
        </div>

        {/* Social proof line */}
        <p className="text-xs text-muted-foreground">
          No credit card needed &mdash; free during beta.
        </p>
      </main>

      {/* ── Feature tease footer ── */}
      <footer className="absolute bottom-8 left-0 right-0 flex justify-center gap-8 text-xs text-muted-foreground px-6">
        <span>Personalised macros</span>
        <span>Pantry-aware AI</span>
        <span>2-minute onboarding</span>
      </footer>
    </div>
  );
}
```

#### Step 7.3 — Add gradient animation keyframes to `src/app/globals.css`

The animated gradient requires a single `@keyframes` definition. Append it to `globals.css` at the bottom of the file so it does not interfere with Track 1's token or reset rules.

```css
/* ── Landing page gradient animation ── */
@keyframes gradient-shift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.animate-gradient-shift {
  animation: gradient-shift 12s ease infinite;
}
```

Additionally, add `animate-gradient-shift` to `tailwind.config.ts` under `theme.extend.animation` so the utility class is recognized by Tailwind's purge:

```typescript
// In tailwind.config.ts → theme.extend.animation:
"gradient-shift": "gradient-shift 12s ease infinite",
```

And under `theme.extend.keyframes`:

```typescript
"gradient-shift": {
  "0%, 100%": { backgroundPosition: "0% 50%" },
  "50%":       { backgroundPosition: "100% 50%" },
},
```

#### Acceptance

- [ ] Two files created; `bun run typecheck` exits 0.
- [ ] `GET /` returns 200 without a session cookie (middleware does not redirect unauthenticated users away from public routes).
- [ ] The page renders the headline, subheading, and both CTA buttons.
- [ ] The "Get started free" and "Sign in" links both point to `/auth/login`.
- [ ] The gradient animation runs on page load with no JS errors in the browser console.
- [ ] Dark mode: the gradient background uses tokens and inverts correctly.
- [ ] The page is accessible: `<main>` landmark present, heading hierarchy correct (`h1` only), buttons have accessible text.

---

### Task 8: Authenticated home page + feature components

**Files created:**
- `src/app/(authenticated)/home/page.tsx`
- `src/app/(authenticated)/home/loading.tsx`
- `src/app/(authenticated)/home/error.tsx`
- `src/components/feature/home/FeedMeCta.tsx`
- `src/components/feature/home/PantryStat.tsx`
- `src/components/feature/home/index.ts`

**Commit prefix:** `home:`

The authenticated home is the emotional payoff after onboarding — the user's command centre. It pre-fetches four data sources in parallel using `Promise.all` and renders a bento-style grid of tiles. The grid layout on mobile is a single column; on tablet+ it is a 2-column grid. Tiles:

1. **Macro ring tile** — big donut ring showing today's consumed vs. target macros. If no check-in today, shows target-only ring in a muted state with a "Log your meals" nudge.
2. **Feed Me CTA tile** — the primary action button. Large, centered, with the bloom hover animation defined in Track 1's token surface.
3. **Pantry stat tile** — item count, a low-stock indicator if fewer than 5 items, and a link to the pantry page.
4. **Check-in peek tile** — today's check-in energy/mood/notes, or an empty state prompting the user to log.
5. **Last cooked tile** — the most recently marked-cooked recipe card, or an empty state.

#### Step 8.1 — Write `src/app/(authenticated)/home/page.tsx`

```typescript
// src/app/(authenticated)/home/page.tsx
// Authenticated home dashboard — renders after onboarding is complete.
// Pure Server Component. All data fetching happens here; components receive typed props.

import { requireUser } from "@/server/auth";
import { createServerClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/server/profile";
import { listActivePantryItems } from "@/server/pantry";
import { getTodayCheckin } from "@/server/checkin";
import { getLastCookedRecipe } from "@/server/recipes";
import { HomeMacroRing } from "@/components/feature/home/HomeMacroRing";
import { PantryStat } from "@/components/feature/home/PantryStat";
import { CheckinPeek } from "@/components/feature/home/CheckinPeek";
import { LastCookedCard } from "@/components/feature/home/LastCookedCard";
import { FeedMeCta } from "@/components/feature/home/FeedMeCta";

export default async function HomePage() {
  const { userId } = await requireUser();
  const supabase = createServerClient();

  // Parallel data fetch — all four sources are independent.
  const [profile, pantryItems, todayCheckin, lastCooked] = await Promise.all([
    getMyProfile(supabase, userId),
    listActivePantryItems(supabase, userId),
    getTodayCheckin(supabase, userId).catch(() => null),
    getLastCookedRecipe(supabase, userId).catch(() => null),
  ]);

  const displayName =
    profile?.display_name ?? (profile as any)?.email?.split("@")[0] ?? "there";

  return (
    <div className="min-h-dvh bg-background px-4 pb-24">
      {/* ── Greeting header ── */}
      <header className="pt-12 pb-6">
        <p className="text-sm font-medium text-muted-foreground mb-0.5">
          Good {getTimeOfDay()}, {displayName}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          What would you like to eat?
        </h1>
      </header>

      {/* ── Feed Me CTA (hero action) ── */}
      <section className="mb-6">
        <FeedMeCta />
      </section>

      {/* ── Bento grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Macro ring tile */}
        <div className="sm:col-span-2 rounded-2xl border border-border bg-card p-5 flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Today&apos;s macros
          </p>
          <HomeMacroRing
            profile={profile}
            checkin={todayCheckin}
          />
        </div>

        {/* Pantry stat tile */}
        <PantryStat itemCount={pantryItems.length} />

        {/* Check-in peek tile */}
        <CheckinPeek checkin={todayCheckin} />

        {/* Last cooked tile */}
        {lastCooked && (
          <div className="sm:col-span-2">
            <LastCookedCard recipe={lastCooked} />
          </div>
        )}
      </div>
    </div>
  );
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
```

#### Step 8.2 — Write `src/app/(authenticated)/home/loading.tsx`

The loading skeleton mirrors the bento layout so the skeleton-to-content transition does not cause layout shift.

```typescript
// src/app/(authenticated)/home/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div className="min-h-dvh bg-background px-4 pb-24">
      {/* Header skeleton */}
      <div className="pt-12 pb-6 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-64" />
      </div>

      {/* CTA skeleton */}
      <Skeleton className="h-14 w-full rounded-2xl mb-6" />

      {/* Bento grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Skeleton className="sm:col-span-2 h-48 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="sm:col-span-2 h-24 rounded-2xl" />
      </div>
    </div>
  );
}
```

#### Step 8.3 — Write `src/app/(authenticated)/home/error.tsx`

```typescript
// src/app/(authenticated)/home/error.tsx
"use client";

import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function HomeError({ error, reset }: ErrorProps) {
  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-6 text-center gap-4">
      <p className="text-4xl">😞</p>
      <h2 className="text-xl font-bold text-foreground">Something went wrong</h2>
      <p className="text-sm text-muted-foreground max-w-xs">
        We could not load your home dashboard. This is probably temporary.
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground font-mono">
          Error ID: {error.digest}
        </p>
      )}
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

#### Step 8.4 — Write `src/components/feature/home/FeedMeCta.tsx`

The Feed Me CTA is a large full-width button that links to `/feed-me`. On hover it plays a subtle bloom animation (scale + glow) using Tailwind transitions. This is the highest-priority action on the page and must feel satisfying to tap.

```typescript
// src/components/feature/home/FeedMeCta.tsx
// Client component needed only for the hover animation class toggle.
"use client";

import Link from "next/link";
import { SparklesIcon } from "lucide-react";
import { cn } from "@/components/ui/utils";

export function FeedMeCta() {
  return (
    <Link
      href="/feed-me"
      className={cn(
        // Layout
        "flex items-center justify-center gap-3",
        "w-full rounded-2xl py-5 px-6",
        // Typography
        "text-lg font-bold tracking-tight",
        // Colors (token-only — no raw hex)
        "bg-accent text-accent-foreground",
        // Interaction
        "transition-all duration-200 ease-out",
        "hover:scale-[1.02] hover:shadow-lg hover:shadow-accent/25",
        "active:scale-[0.98]",
        // Focus
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
    >
      <SparklesIcon className="w-5 h-5 flex-shrink-0" />
      Feed Me
    </Link>
  );
}
```

#### Step 8.5 — Write `src/components/feature/home/PantryStat.tsx`

```typescript
// src/components/feature/home/PantryStat.tsx
import Link from "next/link";
import { ShoppingBasketIcon, AlertTriangleIcon } from "lucide-react";
import { cn } from "@/components/ui/utils";

interface PantryStatProps {
  itemCount: number;
}

const LOW_STOCK_THRESHOLD = 5;

export function PantryStat({ itemCount }: PantryStatProps) {
  const isLow = itemCount < LOW_STOCK_THRESHOLD;

  return (
    <Link
      href="/pantry"
      className={cn(
        "rounded-2xl border bg-card p-5 flex flex-col gap-3",
        "transition-colors duration-150 hover:bg-muted/50",
        isLow ? "border-orange-200 dark:border-orange-900" : "border-border",
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Pantry
        </p>
        {isLow ? (
          <AlertTriangleIcon className="w-4 h-4 text-orange-500" />
        ) : (
          <ShoppingBasketIcon className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      <div>
        <p className="text-3xl font-bold tabular-nums text-foreground">
          {itemCount}
        </p>
        <p className="text-sm text-muted-foreground">
          {itemCount === 1 ? "item" : "items"} in stock
        </p>
      </div>

      {isLow && (
        <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
          Running low &mdash; add more for better recommendations
        </p>
      )}
    </Link>
  );
}
```

#### Step 8.6 — Write `src/components/feature/home/index.ts`

```typescript
// src/components/feature/home/index.ts
export { HomeMacroRing } from "./HomeMacroRing";
export { PantryStat } from "./PantryStat";
export { CheckinPeek } from "./CheckinPeek";
export { LastCookedCard } from "./LastCookedCard";
export { FeedMeCta } from "./FeedMeCta";
export { OnboardingStepper } from "./OnboardingStepper";
export { OnboardingStepFrame } from "./OnboardingStepFrame";
export { GoalStep } from "./GoalStep";
export { BodyDataStep } from "./BodyDataStep";
export { ConfirmTargetsStep } from "./ConfirmTargetsStep";
export { AllergensStep } from "./AllergensStep";
export { PantrySeedStep } from "./PantrySeedStep";
```

#### Acceptance

- [ ] Home page renders correctly for an authed user who has completed onboarding.
- [ ] Parallel `Promise.all` fetch resolves; any individual fetch failure (e.g. no cooked recipes) is caught by `.catch(() => null)` and renders the appropriate empty state.
- [ ] Loading skeleton renders without layout shift.
- [ ] Error boundary shows error message + retry button.
- [ ] FeedMeCta link points to `/feed-me`.
- [ ] PantryStat shows low-stock warning when `itemCount < 5`.
- [ ] `bun run typecheck` exits 0.

---

### Task 9: `HomeMacroRing` pure SVG component

**Files created:**
- `src/components/feature/home/HomeMacroRing.tsx`

**Commit prefix:** `home-ui:`

The `HomeMacroRing` is a pure SVG donut ring that visualises today's consumed macros against the user's targets. It shows three arcs — protein (blue), carbs (amber), fat (orange) — layered concentrically inside a single SVG. When no check-in data is available (empty state), the ring shows the target breakdown in muted/ghost colors with a "Log today" label in the centre.

The component is a **Client Component** because it uses a CSS animation (`@keyframes arc-draw`) to draw the arcs in on first render — the stroke-dashoffset trick. The animation is purely cosmetic and does not affect functionality; a `prefers-reduced-motion` media query pauses it.

#### Step 9.1 — Write `src/components/feature/home/HomeMacroRing.tsx`

```typescript
// src/components/feature/home/HomeMacroRing.tsx
// Pure SVG macro donut ring. Client component for draw animation.
"use client";

import { cn } from "@/components/ui/utils";
import type { Profile } from "@/contracts/zod/profile";
import type { Checkin } from "@/contracts/zod/checkin";

interface HomeMacroRingProps {
  profile: Partial<Profile> | null;
  checkin: Checkin | null;
  /** Override ring diameter in px (default 200) */
  size?: number;
}

interface MacroArc {
  label: string;
  consumed: number;
  target: number;
  /** Token-derived color class for stroke */
  colorClass: string;
  /** Short suffix for the legend */
  unit: string;
}

export function HomeMacroRing({ profile, checkin, size = 200 }: HomeMacroRingProps) {
  const hasData = !!checkin;

  const arcs: MacroArc[] = [
    {
      label: "Protein",
      consumed: checkin?.protein_g ?? 0,
      target: profile?.target_protein_g ?? 150,
      colorClass: "stroke-blue-500",
      unit: "g",
    },
    {
      label: "Carbs",
      consumed: checkin?.carbs_g ?? 0,
      target: profile?.target_carbs_g ?? 200,
      colorClass: "stroke-amber-500",
      unit: "g",
    },
    {
      label: "Fat",
      consumed: checkin?.fat_g ?? 0,
      target: profile?.target_fat_g ?? 65,
      colorClass: "stroke-orange-400",
      unit: "g",
    },
  ];

  const kcalConsumed = checkin?.kcal ?? 0;
  const kcalTarget = profile?.target_kcal ?? 2000;
  const kcalPct = Math.min((kcalConsumed / Math.max(kcalTarget, 1)) * 100, 100);

  const cx = size / 2;
  const cy = size / 2;
  // Three concentric rings, 10px apart, 8px stroke each.
  const radii = [size / 2 - 12, size / 2 - 26, size / 2 - 40];
  const strokeWidth = 8;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* SVG donut */}
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label="Macro progress ring"
        >
          {arcs.map((arc, idx) => {
            const r = radii[idx] ?? radii[0]!;
            const circumference = 2 * Math.PI * r;
            const pct = Math.min(arc.consumed / Math.max(arc.target, 1), 1);
            const filled = circumference * pct;
            const empty = circumference - filled;

            return (
              <g key={arc.label}>
                {/* Background track */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  className="stroke-border"
                  strokeWidth={strokeWidth}
                />
                {/* Progress arc */}
                {(hasData || true) && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="none"
                    className={cn(
                      arc.colorClass,
                      !hasData && "opacity-25",
                      "transition-all duration-700 ease-out",
                    )}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={`${filled} ${empty}`}
                    // Rotate so arcs start at the top (12 o'clock position).
                    transform={`rotate(-90 ${cx} ${cy})`}
                    style={{
                      // CSS animation for draw-in effect.
                      // strokeDashoffset starts at circumference and animates to 0.
                      animation: "arc-draw 0.7s ease-out forwards",
                    }}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Centre label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {hasData ? (
            <>
              <span className="text-2xl font-bold tabular-nums text-foreground">
                {kcalConsumed}
              </span>
              <span className="text-xs text-muted-foreground">of {kcalTarget} kcal</span>
              <div
                className="mt-1 h-1 rounded-full bg-accent/20 w-16 overflow-hidden"
              >
                <div
                  className="h-full bg-accent rounded-full transition-all duration-700"
                  style={{ width: `${kcalPct}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <span className="text-xs font-medium text-muted-foreground text-center leading-tight px-4">
                Log today&apos;s meals
              </span>
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-3 min-w-[140px]">
        {arcs.map((arc) => {
          const pct = Math.round(Math.min((arc.consumed / Math.max(arc.target, 1)) * 100, 100));
          return (
            <div key={arc.label} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  {/* Color dot — inline SVG circle to use the stroke color */}
                  <span
                    className={cn("inline-block w-2.5 h-2.5 rounded-full", arc.colorClass.replace("stroke-", "bg-"))}
                  />
                  <span className="text-xs text-muted-foreground">{arc.label}</span>
                </div>
                <span className="text-xs font-semibold tabular-nums text-foreground">
                  {hasData
                    ? `${arc.consumed}/${arc.target}${arc.unit}`
                    : `${arc.target}${arc.unit}`}
                </span>
              </div>
              {hasData && (
                <div className="h-1 rounded-full bg-muted overflow-hidden w-full">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      arc.colorClass.replace("stroke-", "bg-"),
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

#### Step 9.2 — Add the `arc-draw` keyframe to `globals.css`

```css
/* ── HomeMacroRing draw animation ── */
@keyframes arc-draw {
  from { stroke-dashoffset: 1000; opacity: 0; }
  to   { stroke-dashoffset: 0; opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .arc-draw-animated {
    animation: none !important;
  }
}
```

#### Acceptance

- [ ] Component renders a three-ring SVG donut; `bun run typecheck` exits 0.
- [ ] With `checkin = null`, all arcs render at 0% fill with 25% opacity (ghost state) and the centre shows "Log today's meals".
- [ ] With a full `checkin` object, arcs animate to their fill percentage and the centre shows kcal consumed / target.
- [ ] `prefers-reduced-motion: reduce` disables the arc draw animation.
- [ ] The component is fully accessible: `role="img"` and `aria-label` are present on the SVG.
- [ ] No raw hex or oklch color values in the component — only Tailwind class names derived from tokens.

---

### Task 10: `CheckinPeek` + `LastCookedCard` tiles

**Files created:**
- `src/components/feature/home/CheckinPeek.tsx`
- `src/components/feature/home/LastCookedCard.tsx`

**Commit prefix:** `home-ui:`

These two tiles complete the bento grid. `CheckinPeek` shows today's check-in status at a glance — energy level, mood, and the check-in CTA if not yet logged. `LastCookedCard` shows the title, macros, and date of the last recipe the user marked as cooked — it is a quick reminder of recent cooking history and surfaces the recipe again for repeat cooking.

#### Step 10.1 — Write `src/components/feature/home/CheckinPeek.tsx`

```typescript
// src/components/feature/home/CheckinPeek.tsx
// Today's check-in summary tile. Server-safe (no 'use client' needed).
import Link from "next/link";
import { ZapIcon, SmileIcon } from "lucide-react";
import { cn } from "@/components/ui/utils";
import type { Checkin } from "@/contracts/zod/checkin";

interface CheckinPeekProps {
  checkin: Checkin | null;
}

const ENERGY_LABELS: Record<number, string> = {
  1: "Depleted",
  2: "Low",
  3: "OK",
  4: "Good",
  5: "Energised",
};

const MOOD_LABELS: Record<number, string> = {
  1: "Struggling",
  2: "Meh",
  3: "Neutral",
  4: "Good",
  5: "Great",
};

export function CheckinPeek({ checkin }: CheckinPeekProps) {
  const hasCheckin = !!checkin;

  return (
    <Link
      href="/checkin"
      className={cn(
        "rounded-2xl border border-border bg-card p-5 flex flex-col gap-3",
        "transition-colors duration-150 hover:bg-muted/50",
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Today&apos;s check-in
        </p>
        {hasCheckin && (
          <span className="text-[10px] font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 px-2 py-0.5 rounded-full">
            Logged
          </span>
        )}
      </div>

      {hasCheckin ? (
        <div className="flex gap-4">
          {/* Energy */}
          <div className="flex items-center gap-1.5">
            <ZapIcon className="w-4 h-4 text-amber-500" />
            <div>
              <p className="text-xs text-muted-foreground">Energy</p>
              <p className="text-sm font-semibold text-foreground">
                {ENERGY_LABELS[checkin.energy ?? 3] ?? "—"}
              </p>
            </div>
          </div>

          {/* Mood */}
          <div className="flex items-center gap-1.5">
            <SmileIcon className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">Mood</p>
              <p className="text-sm font-semibold text-foreground">
                {MOOD_LABELS[checkin.mood ?? 3] ?? "—"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">How are you feeling?</p>
          <p className="text-xs text-muted-foreground">
            Log your energy and mood for a personalised recommendation.
          </p>
        </div>
      )}

      <p className="text-xs text-accent font-medium">
        {hasCheckin ? "Update check-in" : "Log check-in →"}
      </p>
    </Link>
  );
}
```

#### Step 10.2 — Write `src/components/feature/home/LastCookedCard.tsx`

```typescript
// src/components/feature/home/LastCookedCard.tsx
// Most recently cooked recipe quick-view tile.
import Link from "next/link";
import { ChefHatIcon, ClockIcon } from "lucide-react";
import { cn } from "@/components/ui/utils";
import type { Recipe } from "@/contracts/zod/recipe";

interface LastCookedCardProps {
  recipe: Recipe & { cooked_at?: string };
}

export function LastCookedCard({ recipe }: LastCookedCardProps) {
  const cookedAt = recipe.cooked_at
    ? new Date(recipe.cooked_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className={cn(
        "rounded-2xl border border-border bg-card p-5",
        "flex items-center gap-4",
        "transition-colors duration-150 hover:bg-muted/50",
      )}
    >
      {/* Icon placeholder (no images in v1 — recipes use LLM-generated text only) */}
      <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
        <ChefHatIcon className="w-6 h-6 text-accent" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-foreground truncate">
            {recipe.title}
          </p>
          {cookedAt && (
            <div className="flex items-center gap-1 flex-shrink-0 text-xs text-muted-foreground">
              <ClockIcon className="w-3 h-3" />
              {cookedAt}
            </div>
          )}
        </div>

        {/* Macro quick-stats */}
        {recipe.macros && (
          <div className="flex gap-3 mt-1">
            <span className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {Math.round(recipe.macros.kcal ?? 0)}
              </span>{" "}
              kcal
            </span>
            <span className="text-xs text-muted-foreground">
              <span className="font-medium text-blue-500">
                {Math.round(recipe.macros.protein_g ?? 0)}g
              </span>{" "}
              protein
            </span>
            <span className="text-xs text-muted-foreground">
              <span className="font-medium text-amber-500">
                {Math.round(recipe.macros.carbs_g ?? 0)}g
              </span>{" "}
              carbs
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
```

#### Step 10.3 — Stub `getLastCookedRecipe` if Track 9 export is not available

Track 9 (`src/server/recipes/`) must export `getLastCookedRecipe(supabase, userId): Promise<(Recipe & { cooked_at: string }) | null>`. If that export does not exist when this track is being implemented (e.g. Track 9 is not merged yet), add a temporary stub file:

```typescript
// src/server/recipes/stub-last-cooked.ts
// REMOVE ONCE TRACK 9 IS MERGED
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Recipe } from "@/contracts/zod/recipe";

export async function getLastCookedRecipe(
  _supabase: SupabaseClient,
  _userId: string,
): Promise<(Recipe & { cooked_at: string }) | null> {
  return null;
}
```

And re-export it from `src/server/recipes/index.ts` if that file does not yet contain the real implementation. **This stub must be deleted when Track 9 merges.**

#### Acceptance

- [ ] Both components render without TypeScript errors.
- [ ] `CheckinPeek` with `checkin = null` shows the "How are you feeling?" empty state with a "Log check-in →" CTA.
- [ ] `CheckinPeek` with a full checkin object shows energy and mood labels.
- [ ] `LastCookedCard` renders recipe title, macro stats, and cooked date.
- [ ] Both tiles have hover state transitions.
- [ ] `bun run typecheck` exits 0.

---

### Task 11: Tests — redirect logic + home snapshot

**Files created:**
- `src/lib/onboarding/__tests__/redirect.test.ts`
- `src/lib/onboarding/__tests__/steps.test.ts`
- `src/app/(authenticated)/home/__tests__/home.snapshot.test.tsx`

**Commit prefix:** (none — test files use the same prefix as the feature they test)

This task writes the unit tests for the two pure logic files from Task 2 and a snapshot test for the home page component tree.

#### Step 11.1 — Write `src/lib/onboarding/__tests__/redirect.test.ts`

```typescript
// src/lib/onboarding/__tests__/redirect.test.ts
import { describe, expect, it } from "vitest";
import { onboardingRedirectPath } from "../redirect";

describe("onboardingRedirectPath", () => {
  it("redirects to step 1 when profile is null", () => {
    expect(onboardingRedirectPath(null, "/home")).toBe("/onboarding/step/1");
  });

  it("redirects to step 1 when profile has no goal", () => {
    expect(onboardingRedirectPath({}, "/home")).toBe("/onboarding/step/1");
  });

  it("redirects to step 2 when goal is set but body data is missing", () => {
    expect(onboardingRedirectPath({ goal: "lose" }, "/home")).toBe(
      "/onboarding/step/2",
    );
  });

  it("redirects to step 3 when body data is complete but target_kcal is 0", () => {
    const partialProfile = {
      goal: "lose",
      height_cm: 175,
      weight_kg: 80,
      birthdate: "1990-01-01",
      sex: "male",
      activity_level: "moderate",
      target_kcal: 0,
    };
    expect(onboardingRedirectPath(partialProfile, "/home")).toBe(
      "/onboarding/step/3",
    );
  });

  it("redirects to step 4 when targets are confirmed but allergens is null", () => {
    const partialProfile = {
      goal: "lose",
      height_cm: 175,
      weight_kg: 80,
      birthdate: "1990-01-01",
      sex: "male",
      activity_level: "moderate",
      target_kcal: 2000,
      allergens: null,
    };
    expect(onboardingRedirectPath(partialProfile, "/home")).toBe(
      "/onboarding/step/4",
    );
  });

  it("redirects to step 5 when allergens are set but onboarding_completed_at is null", () => {
    const partialProfile = {
      goal: "lose",
      height_cm: 175,
      weight_kg: 80,
      birthdate: "1990-01-01",
      sex: "male",
      activity_level: "moderate",
      target_kcal: 2000,
      allergens: ["gluten"],
      onboarding_completed_at: null,
    };
    expect(onboardingRedirectPath(partialProfile, "/home")).toBe(
      "/onboarding/step/5",
    );
  });

  it("returns null when onboarding is complete", () => {
    const completeProfile = {
      goal: "maintain",
      height_cm: 165,
      weight_kg: 65,
      birthdate: "1992-06-15",
      sex: "female",
      activity_level: "active",
      target_kcal: 1900,
      allergens: [],
      onboarding_completed_at: new Date().toISOString(),
    };
    expect(onboardingRedirectPath(completeProfile, "/home")).toBeNull();
  });

  it("returns null when already on an /onboarding/** route (prevents redirect loop)", () => {
    expect(onboardingRedirectPath(null, "/onboarding/step/1")).toBeNull();
    expect(onboardingRedirectPath(null, "/onboarding")).toBeNull();
    expect(onboardingRedirectPath({}, "/onboarding/step/3")).toBeNull();
  });

  it("returns null when onboarding is complete regardless of target route", () => {
    const completeProfile = {
      goal: "gain",
      height_cm: 180,
      weight_kg: 90,
      birthdate: "1995-03-20",
      sex: "male",
      activity_level: "very_active",
      target_kcal: 3000,
      allergens: [],
      onboarding_completed_at: new Date().toISOString(),
    };
    expect(onboardingRedirectPath(completeProfile, "/feed-me")).toBeNull();
    expect(onboardingRedirectPath(completeProfile, "/pantry")).toBeNull();
    expect(onboardingRedirectPath(completeProfile, "/profile")).toBeNull();
  });
});
```

#### Step 11.2 — Write `src/lib/onboarding/__tests__/steps.test.ts`

```typescript
// src/lib/onboarding/__tests__/steps.test.ts
import { describe, expect, it } from "vitest";
import {
  ONBOARDING_STEPS,
  ONBOARDING_TOTAL_STEPS,
  firstIncompleteStep,
  isOnboardingComplete,
} from "../steps";

describe("ONBOARDING_STEPS", () => {
  it("has exactly 5 steps", () => {
    expect(ONBOARDING_STEPS).toHaveLength(5);
    expect(ONBOARDING_TOTAL_STEPS).toBe(5);
  });

  it("steps are numbered 1-5 consecutively", () => {
    ONBOARDING_STEPS.forEach((s, i) => {
      expect(s.step).toBe(i + 1);
    });
  });

  it("step 1 isComplete when goal is set", () => {
    expect(ONBOARDING_STEPS[0]!.isComplete({ goal: "lose" })).toBe(true);
    expect(ONBOARDING_STEPS[0]!.isComplete({ goal: undefined })).toBe(false);
    expect(ONBOARDING_STEPS[0]!.isComplete(null)).toBe(false);
  });

  it("step 2 isComplete only when all body fields are set", () => {
    const full = {
      height_cm: 175,
      weight_kg: 80,
      birthdate: "1990-01-01",
      sex: "male",
      activity_level: "moderate",
    };
    expect(ONBOARDING_STEPS[1]!.isComplete(full)).toBe(true);
    expect(ONBOARDING_STEPS[1]!.isComplete({ ...full, birthdate: undefined })).toBe(false);
  });

  it("step 3 isComplete only when target_kcal > 0", () => {
    expect(ONBOARDING_STEPS[2]!.isComplete({ target_kcal: 2000 })).toBe(true);
    expect(ONBOARDING_STEPS[2]!.isComplete({ target_kcal: 0 })).toBe(false);
    expect(ONBOARDING_STEPS[2]!.isComplete({ target_kcal: undefined })).toBe(false);
    expect(ONBOARDING_STEPS[2]!.isComplete(null)).toBe(false);
  });

  it("step 4 isComplete when allergens is an array (even empty)", () => {
    expect(ONBOARDING_STEPS[3]!.isComplete({ allergens: [] })).toBe(true);
    expect(ONBOARDING_STEPS[3]!.isComplete({ allergens: ["gluten"] })).toBe(true);
    expect(ONBOARDING_STEPS[3]!.isComplete({ allergens: null })).toBe(false);
    expect(ONBOARDING_STEPS[3]!.isComplete({ allergens: undefined })).toBe(false);
  });

  it("step 5 isComplete when onboarding_completed_at is set", () => {
    expect(ONBOARDING_STEPS[4]!.isComplete({ onboarding_completed_at: new Date().toISOString() })).toBe(true);
    expect(ONBOARDING_STEPS[4]!.isComplete({ onboarding_completed_at: null })).toBe(false);
    expect(ONBOARDING_STEPS[4]!.isComplete(null)).toBe(false);
  });
});

describe("firstIncompleteStep", () => {
  it("returns step 1 for a null profile", () => {
    expect(firstIncompleteStep(null)?.step).toBe(1);
  });

  it("returns step 2 when goal is set but body data is missing", () => {
    expect(firstIncompleteStep({ goal: "maintain" })?.step).toBe(2);
  });

  it("returns null when all steps are complete", () => {
    const complete = {
      goal: "lose",
      height_cm: 175,
      weight_kg: 80,
      birthdate: "1990-01-01",
      sex: "male",
      activity_level: "moderate",
      target_kcal: 2000,
      allergens: [],
      onboarding_completed_at: new Date().toISOString(),
    };
    expect(firstIncompleteStep(complete)).toBeNull();
  });
});

describe("isOnboardingComplete", () => {
  it("returns false for null profile", () => {
    expect(isOnboardingComplete(null)).toBe(false);
  });

  it("returns true only when every step isComplete", () => {
    const complete = {
      goal: "gain",
      height_cm: 180,
      weight_kg: 90,
      birthdate: "1995-03-20",
      sex: "male",
      activity_level: "active",
      target_kcal: 3000,
      allergens: [],
      onboarding_completed_at: new Date().toISOString(),
    };
    expect(isOnboardingComplete(complete)).toBe(true);
  });

  it("returns false when only the last step is missing", () => {
    const almostComplete = {
      goal: "gain",
      height_cm: 180,
      weight_kg: 90,
      birthdate: "1995-03-20",
      sex: "male",
      activity_level: "active",
      target_kcal: 3000,
      allergens: [],
      // onboarding_completed_at missing
    };
    expect(isOnboardingComplete(almostComplete)).toBe(false);
  });
});
```

#### Step 11.3 — Write `src/app/(authenticated)/home/__tests__/home.snapshot.test.tsx`

The home snapshot test mocks all upstream data sources and renders the home page RSC in a Vitest environment. Because `HomePage` is an async Server Component, use `React.renderToPipeableStream` or `@testing-library/react`'s async utilities, depending on what is available. The snapshot captures the rendered HTML structure so that accidental regressions in the tile layout are caught.

```typescript
// src/app/(authenticated)/home/__tests__/home.snapshot.test.tsx
import { describe, expect, it, vi, beforeAll } from "vitest";

// ── Module mocks ──────────────────────────────────────────────────────────────
// Mock all server imports that require Supabase credentials or DB access.
vi.mock("@/server/auth", () => ({
  requireUser: vi.fn().mockResolvedValue({ userId: "user-123", email: "test@example.com" }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn().mockReturnValue({}),
}));

const mockProfile = {
  user_id: "user-123",
  goal: "maintain" as const,
  height_cm: 175,
  weight_kg: 75,
  birthdate: "1990-01-01",
  sex: "male" as const,
  activity_level: "moderate" as const,
  target_kcal: 2200,
  target_protein_g: 165,
  target_carbs_g: 275,
  target_fat_g: 73,
  allergens: [],
  display_name: "Test User",
  onboarding_completed_at: new Date().toISOString(),
};

vi.mock("@/server/profile", () => ({
  getMyProfile: vi.fn().mockResolvedValue(mockProfile),
}));

vi.mock("@/server/pantry", () => ({
  listActivePantryItems: vi.fn().mockResolvedValue([
    { id: "1", name: "Chicken breast", category: "protein" },
    { id: "2", name: "Olive oil", category: "fat" },
    { id: "3", name: "Garlic", category: "produce" },
    { id: "4", name: "Pasta", category: "grain" },
    { id: "5", name: "Canned tomatoes", category: "pantry_staple" },
    { id: "6", name: "Onion", category: "produce" },
  ]),
}));

vi.mock("@/server/checkin", () => ({
  getTodayCheckin: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/server/recipes", () => ({
  getLastCookedRecipe: vi.fn().mockResolvedValue(null),
}));

// ── Test ──────────────────────────────────────────────────────────────────────
describe("HomePage", () => {
  it("renders empty-state home without crashing (no checkin, no last cooked)", async () => {
    const { default: HomePage } = await import(
      "@/app/(authenticated)/home/page"
    );

    // renderToPipeableStream is Node-compatible; use renderToString for a simpler approach.
    const { renderToString } = await import("react-dom/server");
    const React = await import("react");

    const html = await renderToString(React.createElement(HomePage));

    // Structural checks — not pixel-perfect, just guards against regressions.
    expect(html).toContain("Feed Me");
    expect(html).toContain("Pantry");
    expect(html).toContain("Today");
    expect(html).toMatchSnapshot();
  });

  it("shows low-stock warning when pantry has fewer than 5 items", async () => {
    const { listActivePantryItems } = await import("@/server/pantry");
    // Override mock for this test only.
    (listActivePantryItems as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { id: "1", name: "Eggs", category: "protein" },
    ]);

    const { default: HomePage } = await import(
      "@/app/(authenticated)/home/page"
    );
    const { renderToString } = await import("react-dom/server");
    const React = await import("react");

    const html = await renderToString(React.createElement(HomePage));

    expect(html).toContain("Running low");
  });
});
```

#### Step 11.4 — Run tests — expected RED, then GREEN

```bash
# Run redirect tests (Task 2 code must already be written — expected GREEN after Task 2)
cd /Users/ravishah/Documents/whattoeat-track-10-home-onboarding && \
  bun run test src/lib/onboarding/__tests__/redirect.test.ts

# Run steps tests (expected GREEN)
bun run test src/lib/onboarding/__tests__/steps.test.ts

# Run home snapshot test (expected GREEN after Tasks 8-10)
bun run test src/app/\(authenticated\)/home/__tests__/home.snapshot.test.tsx
```

Expected: all suites pass.

#### Acceptance

- [ ] `redirect.test.ts` — 9 test cases, all GREEN.
- [ ] `steps.test.ts` — 12+ test cases, all GREEN.
- [ ] `home.snapshot.test.tsx` — 2 test cases, all GREEN. Snapshot file committed.
- [ ] `bun run test` (full suite) exits 0 after all tasks in this plan complete.

---

### Task 12: Integration test — full onboarding flow simulation

**Files created:**
- `src/app/onboarding/__tests__/onboarding-flow.integration.test.ts`

**Commit prefix:** `onboarding:`

This integration test exercises the complete transition from "onboarding required" to "onboarding done" by calling the five server actions in sequence with a mocked Supabase client that tracks profile mutations. It is the closest thing to an end-to-end test that can run in Vitest without a live Supabase instance. The test verifies:

1. A user whose profile has `target_kcal = 0` (the auth-trigger sentinel) is classified as needing onboarding by `onboardingRedirectPath`.
2. Calling the five step actions in sequence mutates the mock profile state.
3. After all five actions complete, `isOnboardingComplete` returns `true` for the final profile state.
4. `onboardingRedirectPath` returns `null` for that final state.

This test is the most important quality gate in the plan — it proves that the onboarding state machine cannot get stuck and that the middleware gate will be lifted after step 3 (which is the critical UX requirement: the user must reach `/home` after confirming their targets, not after step 5).

```typescript
// src/app/onboarding/__tests__/onboarding-flow.integration.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { onboardingRedirectPath, isOnboardingComplete } from "@/lib/onboarding";

// ── Mock the auth helper ──────────────────────────────────────────────────────
vi.mock("@/server/auth", () => ({
  requireUser: vi.fn().mockResolvedValue({ userId: "user-abc", email: "user@example.com" }),
}));

// ── In-memory profile state (simulates the Supabase DB row) ──────────────────
let profileState: Record<string, unknown> = {};

// ── Mock upsertProfile to mutate in-memory state ──────────────────────────────
vi.mock("@/server/profile", () => ({
  upsertProfile: vi.fn(async (_supabase: unknown, _userId: string, patch: Record<string, unknown>) => {
    profileState = { ...profileState, ...patch };
    return { ok: true };
  }),
  getMyProfile: vi.fn(async () => profileState),
}));

// ── Mock computeTargets (from macros lib) ─────────────────────────────────────
vi.mock("@/lib/macros", () => ({
  computeTargets: vi.fn(() => ({
    kcal: 2100,
    protein_g: 160,
    carbs_g: 265,
    fat_g: 70,
  })),
}));

// ── Mock createServerClient ───────────────────────────────────────────────────
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn().mockReturnValue({}),
}));

// ── Mock bulkAddPantryItems ───────────────────────────────────────────────────
vi.mock("@/server/pantry", () => ({
  bulkAddPantryItems: vi.fn().mockResolvedValue({ ok: true }),
}));

// ── Mock next/navigation redirect ────────────────────────────────────────────
// redirect() throws a special Next.js error in the real runtime; in tests we
// intercept it so the action can complete without crashing.
const redirectUrls: string[] = [];
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    redirectUrls.push(url);
    // Simulate the redirect throw so the action terminates after redirect.
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

// ── Import actions AFTER mocks are registered ─────────────────────────────────
const { submitGoalStep } = await import("@/app/onboarding/step/[step]/actions");
const { submitBodyDataStep } = await import("@/app/onboarding/step/[step]/actions");
const { submitConfirmTargetsStep } = await import("@/app/onboarding/step/[step]/actions");
const { submitAllergensStep } = await import("@/app/onboarding/step/[step]/actions");
const { submitPantrySeedStep } = await import("@/app/onboarding/step/[step]/actions");

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFormData(fields: Record<string, string | string[]>): FormData {
  const fd = new FormData();
  for (const [key, val] of Object.entries(fields)) {
    if (Array.isArray(val)) {
      val.forEach((v) => fd.append(key, v));
    } else {
      fd.set(key, val);
    }
  }
  return fd;
}

async function callAction(
  fn: (prev: { ok: boolean }, fd: FormData) => Promise<{ ok: boolean; error?: string }>,
  fields: Record<string, string | string[]>,
): Promise<string | null> {
  try {
    await fn({ ok: true }, makeFormData(fields));
    return null;
  } catch (err) {
    // Capture the redirect URL thrown by the mock.
    const msg = (err as Error).message;
    if (msg.startsWith("NEXT_REDIRECT:")) {
      return msg.replace("NEXT_REDIRECT:", "");
    }
    throw err;
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Onboarding flow — start to finish", () => {
  beforeEach(() => {
    // Reset profile to the auth-trigger sentinel state before each test.
    profileState = { target_kcal: 0 };
    redirectUrls.length = 0;
  });

  it("classifies a brand-new user (target_kcal=0) as needing onboarding", () => {
    expect(onboardingRedirectPath(profileState, "/home")).toBe("/onboarding/step/1");
    expect(isOnboardingComplete(profileState)).toBe(false);
  });

  it("step 1 (goal): writes goal and redirects to step 2", async () => {
    const redirected = await callAction(submitGoalStep, { goal: "lose" });
    expect(profileState.goal).toBe("lose");
    expect(redirected).toBe("/onboarding/step/2");
    // Still incomplete — body data missing.
    expect(isOnboardingComplete(profileState)).toBe(false);
    expect(onboardingRedirectPath(profileState, "/home")).toBe("/onboarding/step/2");
  });

  it("step 2 (body data): writes biometrics and redirects to step 3", async () => {
    profileState.goal = "lose"; // simulate step 1 already done
    const redirected = await callAction(submitBodyDataStep, {
      height_cm: "175",
      weight_kg: "80",
      birthdate: "1990-01-01",
      sex: "male",
      activity_level: "moderate",
    });
    expect(profileState.height_cm).toBe(175);
    expect(profileState.weight_kg).toBe(80);
    expect(redirected).toBe("/onboarding/step/3");
    // Still incomplete — target_kcal is still 0 from auth trigger.
    expect(isOnboardingComplete(profileState)).toBe(false);
  });

  it("step 3 (confirm targets): writes target_kcal > 0 and unlocks middleware gate", async () => {
    Object.assign(profileState, {
      goal: "lose",
      height_cm: 175,
      weight_kg: 80,
      birthdate: "1990-01-01",
      sex: "male",
      activity_level: "moderate",
    });
    const redirected = await callAction(submitConfirmTargetsStep, {
      target_kcal: "2100",
      target_protein_g: "160",
      target_carbs_g: "265",
      target_fat_g: "70",
    });
    expect(profileState.target_kcal).toBe(2100);
    expect(redirected).toBe("/onboarding/step/4");
    // Step 3 is complete — middleware would no longer block /home for steps 1-3 logic,
    // but the onboarding wizard itself still shows steps 4 and 5.
    expect((ONBOARDING_STEPS[2] as any).isComplete(profileState)).toBe(true);
  });

  it("step 4 (allergens): writes allergens array and redirects to step 5", async () => {
    Object.assign(profileState, {
      goal: "lose",
      height_cm: 175,
      weight_kg: 80,
      birthdate: "1990-01-01",
      sex: "male",
      activity_level: "moderate",
      target_kcal: 2100,
    });
    const redirected = await callAction(submitAllergensStep, {
      allergens: ["gluten", "dairy"],
    });
    expect(profileState.allergens).toEqual(["gluten", "dairy"]);
    expect(redirected).toBe("/onboarding/step/5");
  });

  it("step 4 (allergens): empty selection still writes [] and advances", async () => {
    Object.assign(profileState, {
      goal: "lose",
      height_cm: 175,
      weight_kg: 80,
      birthdate: "1990-01-01",
      sex: "male",
      activity_level: "moderate",
      target_kcal: 2100,
    });
    const redirected = await callAction(submitAllergensStep, {});
    expect(profileState.allergens).toEqual([]);
    expect(redirected).toBe("/onboarding/step/5");
  });

  it("step 5 (pantry seed + complete): sets onboarding_completed_at and redirects to /home", async () => {
    Object.assign(profileState, {
      goal: "lose",
      height_cm: 175,
      weight_kg: 80,
      birthdate: "1990-01-01",
      sex: "male",
      activity_level: "moderate",
      target_kcal: 2100,
      allergens: [],
    });
    const redirected = await callAction(submitPantrySeedStep, {
      pantry_text: "chicken, rice, olive oil",
    });
    expect(profileState.onboarding_completed_at).toBeTruthy();
    expect(redirected).toBe("/home");
  });

  it("full flow: after all 5 steps, isOnboardingComplete is true", async () => {
    // Step 1
    await callAction(submitGoalStep, { goal: "maintain" });
    // Step 2
    await callAction(submitBodyDataStep, {
      height_cm: "165",
      weight_kg: "62",
      birthdate: "1993-07-22",
      sex: "female",
      activity_level: "light",
    });
    // Step 3
    await callAction(submitConfirmTargetsStep, {
      target_kcal: "1900",
      target_protein_g: "140",
      target_carbs_g: "240",
      target_fat_g: "63",
    });
    // Step 4
    await callAction(submitAllergensStep, { allergens: [] });
    // Step 5
    await callAction(submitPantrySeedStep, { pantry_text: "" });

    expect(isOnboardingComplete(profileState)).toBe(true);
    expect(onboardingRedirectPath(profileState, "/home")).toBeNull();
  });

  it("skip pantry step: skipping step 5 still completes onboarding", async () => {
    Object.assign(profileState, {
      goal: "gain",
      height_cm: 182,
      weight_kg: 85,
      birthdate: "1997-11-05",
      sex: "male",
      activity_level: "very_active",
      target_kcal: 3200,
      allergens: [],
    });
    // Submit with empty pantry text (skip)
    const redirected = await callAction(submitPantrySeedStep, { pantry_text: "" });
    expect(redirected).toBe("/home");
    expect(isOnboardingComplete(profileState)).toBe(true);
  });
});
```

Note: The test imports `ONBOARDING_STEPS` from `@/lib/onboarding` for the step 3 assertion. Add that import at the top of the test file:

```typescript
import { ONBOARDING_STEPS } from "@/lib/onboarding";
```

#### Step 12.1 — Run the integration test suite — expected GREEN

```bash
cd /Users/ravishah/Documents/whattoeat-track-10-home-onboarding && \
  bun run test src/app/onboarding/__tests__/onboarding-flow.integration.test.ts --reporter=verbose
```

Expected: all 9 test cases GREEN.

#### Step 12.2 — Run the full test suite

```bash
cd /Users/ravishah/Documents/whattoeat-track-10-home-onboarding && bun run test
```

Expected: exit 0. If any test from another track fails, investigate before declaring Track 10 ready for PR.

#### Step 12.3 — Final typecheck

```bash
cd /Users/ravishah/Documents/whattoeat-track-10-home-onboarding && bun run typecheck
```

Expected: exit 0.

#### Step 12.4 — Lint

```bash
cd /Users/ravishah/Documents/whattoeat-track-10-home-onboarding && bun run lint
```

Expected: exit 0 (no new lint errors introduced by this track).

#### Acceptance

- [ ] 9 integration test cases GREEN.
- [ ] `isOnboardingComplete(profileState)` is `true` after the full flow.
- [ ] `onboardingRedirectPath(profileState, "/home")` returns `null` after the full flow.
- [ ] `bun run test` (full suite) exits 0.
- [ ] `bun run typecheck` exits 0.
- [ ] `bun run lint` exits 0.

---

## Final verification checklist

Run the following commands from the worktree root before opening the PR:

```bash
WD=/Users/ravishah/Documents/whattoeat-track-10-home-onboarding

# 1. Type safety
cd $WD && bun run typecheck

# 2. Lint
cd $WD && bun run lint

# 3. Tests
cd $WD && bun run test

# 4. Dev build smoke-test
cd $WD && bun run build 2>&1 | tail -20

# 5. Confirm no raw colors
grep -rn --include="*.tsx" --include="*.ts" \
  -E "#[0-9a-fA-F]{3,6}|oklch\(|rgb\(|hsl\(" \
  $WD/src/components/feature/home/ \
  $WD/src/app/\(public\)/ \
  $WD/src/app/\(authenticated\)/home/ \
  $WD/src/app/onboarding/ | grep -v "node_modules" | grep -v ".test." || echo "CLEAN"

# 6. Confirm no HTML entities
grep -rn "&amp;\|&lt;\|&gt;\|&quot;\|&#39;" \
  $WD/src/components/feature/home/ \
  $WD/src/app/\(public\)/page.tsx \
  $WD/src/app/onboarding/ || echo "CLEAN"
```

All six commands must exit cleanly before the PR is opened.

---

## T10 acceptance criteria (from `kanban-tasks.yaml`)

| # | Criterion | Verified by |
|---|---|---|
| 1 | Animated gradient hero on public landing | Visual + `GET /` returns 200 without session |
| 2 | Feed Me CTA staged motion (compress → bloom → cards) | FeedMeCta bloom animation + link to `/feed-me` |
| 3 | 3-pane onboarding with brand-voice copy | 5-step wizard with warm copy at each step |
| 4 | Delight-skill polish on every core surface | Hover states, transitions, arc draw animation, goal card tap-targets |
| 5 | Brand-new user redirected from /home to /onboarding until step 3 completes | Middleware patch + integration test |
| 6 | HomeMacroRing SVG donut with protein/carbs/fat arcs | Task 9 component + snapshot test |
| 7 | PantryStat shows low-stock nudge | Task 8.5 + snapshot test |
| 8 | CheckinPeek + LastCookedCard tiles | Task 10 |
| 9 | Empty-state home snapshot | Task 11.3 |
| 10 | Redirect logic unit tests | Task 11.1 + 11.2 |
| 11 | Full onboarding flow integration test | Task 12 |

---

*Plan authored 2026-04-26. Branch: `wt/track-10-home-onboarding`. Implements after T1/T5/T6/T8 land.*






