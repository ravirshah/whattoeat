# WhatToEat 2.0 — Security Audit
Date: 2026-04-26

---

## Critical

**C1 — `.env.local` contains live credentials (not committed, but a hygiene risk)**
`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_DB_URL` are present with real values in `/.env.local`. If this file is ever accidentally committed, the service-role JWT (bypasses all RLS) and direct Postgres URL are exposed. File: `/.env.local`
_Fix:_ Add a `trufflehog`/`gitleaks` pre-push hook in CI; rotate credentials if ever committed.

**C2 — Drizzle `db` client uses a service-role Postgres connection that bypasses all RLS**
`src/db/client.ts` connects via `SUPABASE_DB_URL` — a superuser-level direct connection. Files `apply-health-extraction.ts`, `extract-health-doc.ts`, `profile/repo.ts`, `checkin/repo.ts`, `weekly-insight-repo.ts`, and `recommendation/repo.ts` all use it. If any of these accidentally omit a `userId` WHERE filter, all users' data is exposed with no RLS safety net.
_Fix:_ Document the risk on the `db` export; add a lint rule prohibiting it outside `src/server/`; add application-level `userId` filters as a mandatory second layer (most already do this, but `recommendation/repo.ts` and `weekly-insight-repo.ts` should be audited).

---

## High

**H1 — `parsePantryFreeform` has no `requireUser()` and no rate limit**
File: `src/server/pantry/parse-freeform.ts` — it's a `'use server'` action with no auth check and no `assertWithinDailyCap`. An unauthenticated actor can call it repeatedly to exhaust Gemini quota.
_Fix:_ Add `requireUser()` at the top and `assertWithinDailyCap(userId, 'pantry:parse')`.

**H2 — `extractHealthDoc` has no rate limit**
File: `src/server/profile/extract-health-doc.ts` — does call `requireUser()` but has no `assertWithinDailyCap`. An authenticated user can submit health documents in a tight loop.
_Fix:_ Add `assertWithinDailyCap(userId, 'profile:extractHealth')` before the LLM call.

**H3 — `dbSetSaved` and `dbDeleteRecipe` lack a `user_id` filter (rely solely on RLS)**
Files: `src/server/recipes/repo.ts:52-56, 62-64` — both functions mutate/delete by `id` alone, with no `.eq('user_id', userId)`. The anon Supabase client's RLS policy is the only guard. If RLS is misconfigured, any authenticated user could delete another user's recipes.
_Fix:_ Add `userId` parameters and `.eq('user_id', userId)` to both functions, matching the pantry repo pattern.

**H4 — `next` redirect param not validated before being embedded in Supabase magic-link `emailRedirectTo`**
Files: `src/app/auth/login/page.tsx:13-22`, `src/components/auth/SignInForm.tsx:22` — the `next` value from `searchParams` is passed directly into the `emailRedirectTo` URL. The `auth/callback` route validates it on arrival, but any regression or bypass there allows open redirect after a successful magic-link sign-in.
_Fix:_ Validate `next` in `LoginPage` before passing to `SignInForm` (must start with `/` and not `//`).

---

## Medium

**M1 — Rate-limit fail-open when Upstash is unreachable**
File: `src/lib/rate-limit/assert-daily-cap.ts:87` — catch block returns `{ ok: true }`, silently disabling rate limiting during Upstash outages.
_Fix:_ Add a Sentry alert on the fail-open path; consider returning a 503 for LLM-backed actions.

**M2 — `getCheckinsForRange` accepts unvalidated date string parameters**
File: `src/server/checkin/actions.ts:61` — `start` and `end` are passed to Drizzle without format validation. Drizzle parameterizes, so SQL injection is not exploitable, but a multi-year range causes a full table scan.
_Fix:_ Validate with `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` and assert `start <= end`.

**M3 — `listRecentCheckins(days)` and `listCookedLog(days)` accept arbitrarily large values**
Files: `src/server/checkin/actions.ts:51`, `src/server/recipes/actions.ts:179` — no ceiling on `days` means a caller can request years of data in one query.
_Fix:_ Clamp to a reasonable maximum: `const clampedDays = Math.min(days, 365)`.

**M4 — `applyHealthExtraction` is not atomic (TOCTOU / partial-apply window)**
File: `src/server/profile/apply-health-extraction.ts:70-76` — `upsertProfile` runs first, then a separate UPDATE marks the extraction applied. A process crash between the two leaves the extraction re-applicable, duplicating profile mutations.
_Fix:_ Wrap both operations in a Postgres transaction, or perform a conditional UPDATE-then-check.

**M5 — `Sentry.captureException` in `withInstrumentation` may capture LLM prompt snippets**
File: `src/server/instrumentation/with-instrumentation.ts` — errors thrown from engine calls can include partial prompt text in `err.message` or `err.cause`. These reach Sentry unredacted.
_Fix:_ Add a `beforeSend` scrubber in `sentry.server.config.ts` stripping known sensitive fields (`prompt`, `text`, `responseBody`).

**M6 — `console.warn/error` in server actions emit engine `fields` objects and raw LLM errors**
Files: `src/server/recommendation/actions.ts:73-75` (engine logger), `src/server/pantry/parse-freeform.ts:126` — logged to stdout which flows into Vercel log drains; may contain meal-suggestion details derived from health data.
_Fix:_ Use the structured logger with explicit field selection instead of spreading the full error/fields object.

---

## Low

**L1 — `dangerouslySetInnerHTML` for dark-mode script (accepted risk)**
File: `src/app/layout.tsx:99` — the content is a compile-time static string with no user data. Risk is negligible; confirmed with Biome suppression comment. Keep under review if the script ever incorporates dynamic values.

**L2 — `listCookedLog` passes caller-supplied `days` directly to `.limit()`**
Same as M3 — `listCookedLog` is also callable with an uncapped `days` arg (callers currently hardcode 30 but any future caller could pass arbitrary values).

**L3 — `userId` UUID sent as a Sentry scope tag on every instrumented action**
File: `src/server/instrumentation/tags.ts:29` — transmits raw internal user ID to Sentry. Acceptable under most data-residency rules but review against your privacy policy.

**L4 — `dbInsertRecipe` has no `ON CONFLICT DO NOTHING`**
File: `src/server/recipes/repo.ts:28` — rapid double-taps can create duplicate recipe rows. Not a security issue; integrity concern.

---

## Looked at but clean

- **Auth middleware**: uses `getUser()` (not `getSession()`); all protected routes correctly enumerated; `next` param set via `searchParams.set()`.
- **Auth callback** (`/auth/callback/route.ts`): `isSafeRelative` check present; uses `appUrl` not `request.url` as redirect base.
- **All server actions**: every mutating action calls `requireUser()` before DB access; no `userId` from request bodies.
- **RLS policies**: all tables have RLS enabled; all user-owned tables have self-only read/write policies. `recommendation_runs` and `weekly_insights` inserts are service-role only — correct.
- **Service-role key**: only used in dev-only `auth/dev/route.ts` (which 404s in prod) and indirectly via `SUPABASE_DB_URL`; never in engine or client bundles.
- **Engine layer purity**: `_purity.test.ts` enforces no `next`/`@supabase`/`drizzle-orm`; confirmed clean.
- **Sentry Replay**: `maskAllText: true, blockAllMedia: true` in `sentry.client.config.ts`.
- **Input validation**: pantry, recommendation, and profile actions all run Zod before touching the DB.
- **CSRF**: Next.js server actions use the `Next-Action` header with an origin check; no custom CSRF needed.
- **SSRF**: no user-supplied URLs are fetched in server code.
- **XSS**: no user data reaches `dangerouslySetInnerHTML`.
- **Secret leakage**: `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `UPSTASH_REDIS_REST_TOKEN`, `SUPABASE_DB_URL` are all non-`NEXT_PUBLIC_` and absent from client code. `NEXT_PUBLIC_GEMINI_API_KEY` exists in `.env.example` but is empty and unused in source.
- **Dev-only routes**: `auth/dev/route.ts` hard-404s in production; dev shortcut link in `SignInForm` is compile-time gated on `NODE_ENV`.

---

**Summary counts:** 2 Critical, 4 High, 6 Medium, 4 Low. The most impactful items to fix first are **H1** (unauthenticated Gemini calls via `parsePantryFreeform`) and **H2** (no rate limit on `extractHealthDoc`), as they directly expose quota/cost; then **H3** (recipe mutation missing userId filter) and **H4** (open redirect hygiene).
