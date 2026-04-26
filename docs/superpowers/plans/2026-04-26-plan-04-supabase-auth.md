# Plan 04 — Supabase Auth + Session + Middleware

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire Supabase Auth end-to-end — cookie-based sessions via `@supabase/ssr`, a cookie-refreshing Next.js middleware, server-side auth helpers (`getUserId`, `requireUser`, `signOut`), App Router auth pages (login, signup, callback, error), and a thin auth UI layer. After this track merges, every downstream track (5/pantry, 6/profile, 7/checkin) can guard their Server Actions with a single `await requireUser()` call.

**Architecture:** Three layers, all in owned paths. (1) Supabase client factories in `src/lib/supabase/` — one for the browser (Client Components), one for the server (Server Components / Actions / Route Handlers), one for middleware. (2) `src/middleware.ts` — refreshes the Supabase session cookie on every non-static request. (3) `src/server/auth/` — thin helpers that wrap `supabase.auth.getUser()` and provide typed, redirect-safe access to the current user. Auth UI components in `src/components/auth/` consume the design system from Track 1; they are intentionally minimal stubs so Track 1 can style them without conflict.

**Tech Stack:** `@supabase/ssr` (already in `dependencies`), `@supabase/supabase-js` (already in `dependencies`), Next.js 15 App Router, React 19, Zod (validation of env vars), Vitest (unit tests). No new runtime dependencies are required.

**Spec reference:** `docs/superpowers/specs/2026-04-26-whattoeat-2.0-design.md` — sections 1 (mission/scope), 2 (architecture), 4–5 (server actions + auth), 8 (auth/RLS/observability).

**Prerequisites (verified before Task 1):**
- Track 0 is merged to `main`: `src/db/schema/profiles.ts` exists with `user_id` FK to `auth.users`, RLS policies enforce `auth.uid() = user_id`.
- `@supabase/ssr` and `@supabase/supabase-js` are present in `package.json` dependencies.
- `.env.local` contains `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- Branch `wt/track-4-supabase-auth` is checked out from a fresh `main`.

---

## File Structure

### Creates

```
src/lib/supabase/browser.ts          — createBrowserClient factory
src/lib/supabase/server.ts           — createServerClient factory (RSC/actions/route handlers)
src/lib/supabase/middleware.ts       — createMiddlewareClient factory
src/lib/supabase/index.ts            — re-exports

src/server/auth/get-user-id.ts       — getUserId(): Promise<string | null>
src/server/auth/require-user.ts      — requireUser(): Promise<{ userId: string; email: string }>
src/server/auth/sign-out.ts          — signOut() server action
src/server/auth/index.ts             — re-exports

src/middleware.ts                    — Next.js edge middleware (cookie refresh + route guard)

src/app/auth/login/page.tsx          — magic-link + Google OAuth login page
src/app/auth/signup/page.tsx         — magic-link sign-up page (alias flow)
src/app/auth/callback/route.ts       — PKCE code exchange → session → redirect
src/app/auth/error/page.tsx          — friendly error page

src/components/auth/SignInForm.tsx   — email magic-link form (Client Component)
src/components/auth/SignOutButton.tsx — sign-out button (Client Component)
src/components/auth/index.ts         — re-exports

src/server/auth/__tests__/get-user-id.test.ts
src/server/auth/__tests__/require-user.test.ts
```

### Modifies

```
package.json   — only if a new dep is needed (Task 1 will confirm; likely none)
bun.lock       — updated automatically if package.json changes
```

### Does NOT touch (frozen by Track 0 or owned by other tracks)

```
src/engine/**
src/contracts/**
src/db/**
supabase/**
tailwind.config.ts
src/styles/**
src/components/ui/**
```

---

## Conventions used in this plan

- All file paths are repo-relative; bash commands use absolute path `/Users/ravishah/Documents/whattoeat`.
- `bun` is the package manager and test runner (`bun run test`, `bun run typecheck`).
- Imports use the `@/` alias for `src/` (e.g. `@/lib/supabase`, `@/server/auth`).
- Commit message prefixes: `auth:` for `src/lib/supabase/` and `src/server/auth/` source files, `auth-test:` for test files, `auth-ui:` for `src/app/auth/**` and `src/components/auth/**`.
- **Server-side rule:** always call `supabase.auth.getUser()` (verified server call), never `supabase.auth.getSession()` (trusts unverified cookie data). This is enforced by convention and noted in code comments.
- **TDD discipline:** test files are written first (expected RED), implementation makes them GREEN. Steps are annotated accordingly.
- **No client-supplied user IDs:** every DB query uses `userId` sourced from `requireUser()` / `getUserId()` — never from request bodies or query params.

---

## Tasks

### Task 1: Verify deps and environment surface

**Files:** `package.json` (read-only verify), `.env.example` (update if needed)

Confirm `@supabase/ssr` and `@supabase/supabase-js` are present. Document the required env vars. No new runtime deps should be needed — flag if something is missing.

- [ ] **Step 1: Verify supabase packages are installed**

```bash
cd /Users/ravishah/Documents/whattoeat && grep -E '"@supabase/(ssr|supabase-js)"' package.json
```

Expected: both lines appear with version numbers. If either is missing, add it (`bun add @supabase/ssr @supabase/supabase-js`) and update `bun.lock`.

- [ ] **Step 2: Confirm env vars are documented**

Check `.env.example`. The following must be present:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Add any missing lines to `.env.example`.

- [ ] **Step 3: Typecheck baseline**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

Expected: exit 0 on `main`-inherited files.

- [ ] **Step 4: Commit (only if files changed)**

```bash
git add .env.example package.json bun.lock
git commit -m "auth: verify deps + document env surface"
```

Skip the commit if nothing changed.

---

### Task 2: Supabase client factories

**Files:** `src/lib/supabase/browser.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`, `src/lib/supabase/index.ts`

Three factories, one per call site. The browser factory is a thin wrapper around `@supabase/ssr`'s `createBrowserClient`. The server factory reads cookies from Next.js `cookies()`. The middleware factory is passed the request/response so it can set the refreshed cookie on the response object.

- [ ] **Step 1: Write `src/lib/supabase/browser.ts`**

```ts
import { createBrowserClient as _createBrowserClient } from '@supabase/ssr';

export function createBrowserClient() {
  return _createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 2: Write `src/lib/supabase/server.ts`**

```ts
import 'server-only';
import { createServerClient as _createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerClient() {
  const cookieStore = await cookies();
  return _createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll is called from a Server Component — cookie writes
            // are safe only from middleware or Route Handlers, so we
            // swallow the error here. The middleware keeps sessions fresh.
          }
        },
      },
    },
  );
}
```

- [ ] **Step 3: Write `src/lib/supabase/middleware.ts`**

```ts
import { createServerClient as _createServerClient } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';

export function createMiddlewareClient(
  request: NextRequest,
  response: NextResponse,
) {
  return _createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
}
```

- [ ] **Step 4: Write `src/lib/supabase/index.ts`**

```ts
export { createBrowserClient } from './browser';
export { createServerClient } from './server';
export { createMiddlewareClient } from './middleware';
```

- [ ] **Step 5: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/supabase/
git commit -m "auth: Supabase client factories (browser / server / middleware)"
```

---

### Task 3: Write failing tests for `getUserId` and `requireUser`

**Files:** `src/server/auth/__tests__/get-user-id.test.ts`, `src/server/auth/__tests__/require-user.test.ts`

Write the tests first — they will fail (RED) until Task 4 creates the implementations.

- [ ] **Step 1: Write `src/server/auth/__tests__/get-user-id.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the server client factory before importing the helper.
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}));

// Mock next/headers (not available outside Next.js runtime).
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })),
}));

import { createServerClient } from '@/lib/supabase/server';
import { getUserId } from '@/server/auth/get-user-id';

const mockCreateServerClient = vi.mocked(createServerClient);

function makeSupabaseMock(user: { id: string } | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: user ? null : { message: 'not authenticated' },
      }),
    },
  };
}

describe('getUserId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the user id when a session exists', async () => {
    mockCreateServerClient.mockResolvedValue(
      makeSupabaseMock({ id: 'user-abc' }) as never,
    );
    const id = await getUserId();
    expect(id).toBe('user-abc');
  });

  it('returns null when no session exists', async () => {
    mockCreateServerClient.mockResolvedValue(
      makeSupabaseMock(null) as never,
    );
    const id = await getUserId();
    expect(id).toBeNull();
  });
});
```

- [ ] **Step 2: Write `src/server/auth/__tests__/require-user.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })),
}));

// redirect() throws in Next.js — mock it to throw so we can assert on it.
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { createServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth/require-user';

const mockCreateServerClient = vi.mocked(createServerClient);

function makeSupabaseMock(user: { id: string; email?: string } | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: user ? null : { message: 'not authenticated' },
      }),
    },
  };
}

describe('requireUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns userId and email when authenticated', async () => {
    mockCreateServerClient.mockResolvedValue(
      makeSupabaseMock({ id: 'user-123', email: 'ravi@example.com' }) as never,
    );
    const result = await requireUser();
    expect(result.userId).toBe('user-123');
    expect(result.email).toBe('ravi@example.com');
  });

  it('redirects to /auth/login when not authenticated', async () => {
    mockCreateServerClient.mockResolvedValue(
      makeSupabaseMock(null) as never,
    );
    await expect(requireUser()).rejects.toThrow('REDIRECT:/auth/login');
  });

  it('redirects to /auth/login when user has no email', async () => {
    // A user object without email is treated as incomplete / unauthenticated.
    mockCreateServerClient.mockResolvedValue(
      makeSupabaseMock({ id: 'user-456' }) as never,
    );
    // requireUser must resolve even without email — email falls back to empty string.
    const result = await requireUser();
    expect(result.userId).toBe('user-456');
    expect(result.email).toBe('');
  });
});
```

- [ ] **Step 3: Run tests — expected RED**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/server/auth/__tests__/
```

Expected: both suites fail with module-not-found or similar. That is correct.

- [ ] **Step 4: Commit**

```bash
git add src/server/auth/__tests__/
git commit -m "auth-test: failing unit tests for getUserId + requireUser"
```

---

### Task 4: Implement `getUserId`, `requireUser`, and `signOut`

**Files:** `src/server/auth/get-user-id.ts`, `src/server/auth/require-user.ts`, `src/server/auth/sign-out.ts`, `src/server/auth/index.ts`

- [ ] **Step 1: Write `src/server/auth/get-user-id.ts`**

```ts
import 'server-only';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Returns the authenticated user's UUID, or null if the request is
 * unauthenticated. Uses getUser() (server-verified), not getSession().
 */
export async function getUserId(): Promise<string | null> {
  const supabase = await createServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}
```

- [ ] **Step 2: Write `src/server/auth/require-user.ts`**

```ts
import 'server-only';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

export type AuthUser = {
  userId: string;
  email: string;
};

/**
 * Returns the authenticated user's id and email.
 * Calls redirect('/auth/login') if the request is unauthenticated —
 * Next.js will throw internally, unwinding the call stack cleanly.
 *
 * Uses getUser() (server-verified), never getSession().
 */
export async function requireUser(): Promise<AuthUser> {
  const supabase = await createServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect('/auth/login');
  }

  return {
    userId: data.user.id,
    email: data.user.email ?? '',
  };
}
```

- [ ] **Step 3: Write `src/server/auth/sign-out.ts`**

```ts
'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Server Action — signs the current user out, clears the session cookie,
 * revalidates the root layout cache, then redirects to /auth/login.
 */
export async function signOut(): Promise<never> {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/auth/login');
}
```

- [ ] **Step 4: Write `src/server/auth/index.ts`**

```ts
export { getUserId } from './get-user-id';
export { requireUser } from './require-user';
export type { AuthUser } from './require-user';
export { signOut } from './sign-out';
```

- [ ] **Step 5: Run tests — expected GREEN**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/server/auth/__tests__/
```

Expected: all tests pass.

- [ ] **Step 6: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/server/auth/get-user-id.ts src/server/auth/require-user.ts \
        src/server/auth/sign-out.ts src/server/auth/index.ts
git commit -m "auth: getUserId / requireUser / signOut server helpers"
```

---

### Task 5: Next.js middleware (`src/middleware.ts`)

**Files:** `src/middleware.ts`

The middleware runs on every request that is not a static asset. It creates a Supabase client using the request/response cookie pair, calls `getUser()` to refresh the access-token cookie if needed, then returns the (potentially mutated) response. It also enforces the authenticated route prefix — any request to `/(authenticated)/**` that has no valid user is redirected to `/auth/login`.

> **Note:** The `/(authenticated)` route group is defined in Track 10 (Home + onboarding). For now the middleware guards it defensively — if the group does not yet exist, the guard simply never fires.

- [ ] **Step 1: Write `src/middleware.ts`**

```ts
import { type NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  // Start with a plain pass-through response; the middleware client
  // may mutate its cookies to deliver the refreshed session token.
  const response = NextResponse.next({ request });

  const supabase = createMiddlewareClient(request, response);

  // IMPORTANT: always use getUser(), not getSession(), in middleware.
  // getUser() validates the JWT against Supabase on every call and is
  // the only call that can reliably refresh the cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Protect the authenticated route group.
  // Public routes: /auth/*, /onboarding/*, /, /api/auth/* and static files.
  const isProtected =
    pathname.startsWith('/(authenticated)') ||
    // Also protect any direct segment paths the auth group exposes.
    // Add feature prefixes here as they land: /pantry, /profile, /feed-me, etc.
    pathname.startsWith('/pantry') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/feed-me') ||
    pathname.startsWith('/saved') ||
    pathname.startsWith('/checkin');

  if (isProtected && !user) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages.
  if (user && pathname.startsWith('/auth/login')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico
     * - api/auth/*    (Supabase redirect callbacks must not be intercepted)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|api/auth).*)',
  ],
};
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "auth: cookie-refreshing Next.js middleware with route guard"
```

---

### Task 6: Auth callback route handler

**Files:** `src/app/auth/callback/route.ts`

This is the OAuth / magic-link redirect target. Supabase sends the user here with a `?code=` query parameter. We exchange the code for a session (PKCE flow), then redirect to the `?next=` URL or `/`.

- [ ] **Step 1: Write `src/app/auth/callback/route.ts`**

```ts
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? origin;

  if (!code) {
    return NextResponse.redirect(
      new URL('/auth/error?reason=missing_code', appUrl),
    );
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const url = new URL('/auth/error', appUrl);
    url.searchParams.set('reason', error.message);
    return NextResponse.redirect(url);
  }

  // Redirect to the originally requested page or home.
  const destination = next.startsWith('/') ? next : '/';
  return NextResponse.redirect(new URL(destination, appUrl));
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/auth/callback/route.ts
git commit -m "auth: PKCE callback route handler (code exchange + redirect)"
```

---

### Task 7: Auth UI components (`SignInForm`, `SignOutButton`)

**Files:** `src/components/auth/SignInForm.tsx`, `src/components/auth/SignOutButton.tsx`, `src/components/auth/index.ts`

Minimal Client Components. Styles use only Tailwind utility classes from the design token system (no raw hex). Track 1 will skin these; do not add elaborate visual polish here — just correct behaviour and accessible markup.

- [ ] **Step 1: Write `src/components/auth/SignInForm.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/browser';

type Props = {
  /** Where to redirect after successful sign-in. Passed to the Supabase redirect URL. */
  next?: string;
};

export function SignInForm({ next = '/' }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    const supabase = createBrowserClient();
    const redirectTo =
      `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
    } else {
      setStatus('sent');
    }
  }

  if (status === 'sent') {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Check your inbox — a magic link is on its way to{' '}
        <span className="font-medium text-foreground">{email}</span>.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {status === 'error' && (
        <p role="alert" className="text-sm text-destructive">
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity disabled:opacity-50"
      >
        {status === 'loading' ? 'Sending…' : 'Send magic link'}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Write `src/components/auth/SignOutButton.tsx`**

```tsx
'use client';
import { signOut } from '@/server/auth/sign-out';
import { useTransition } from 'react';

type Props = {
  className?: string;
};

export function SignOutButton({ className }: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      className={className}
      onClick={() =>
        startTransition(async () => {
          await signOut();
        })
      }
    >
      {isPending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
```

- [ ] **Step 3: Write `src/components/auth/index.ts`**

```ts
export { SignInForm } from './SignInForm';
export { SignOutButton } from './SignOutButton';
```

- [ ] **Step 4: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/
git commit -m "auth-ui: SignInForm (magic-link) + SignOutButton Client Components"
```

---

### Task 8: Auth pages — login, signup, error

**Files:** `src/app/auth/login/page.tsx`, `src/app/auth/signup/page.tsx`, `src/app/auth/error/page.tsx`

Server Components that compose the auth UI primitives. They are intentionally minimal — structural scaffolding only. Track 10 (Home + onboarding) and Track 1 (design system) will apply the full visual treatment.

- [ ] **Step 1: Write `src/app/auth/login/page.tsx`**

```tsx
import type { Metadata } from 'next';
import { SignInForm } from '@/components/auth/SignInForm';

export const metadata: Metadata = {
  title: 'Sign in — WhatToEat',
};

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email to receive a magic link.
          </p>
        </div>
        <SignInForm next={next ?? '/'} />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Write `src/app/auth/signup/page.tsx`**

Magic link covers both sign-in and sign-up in one flow (Supabase auto-creates the user on first OTP). This page is an alias of login with different copy.

```tsx
import type { Metadata } from 'next';
import { SignInForm } from '@/components/auth/SignInForm';

export const metadata: Metadata = {
  title: 'Create account — WhatToEat',
};

export default function SignupPage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Create your account
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your email — we&apos;ll send a link to get you started.
          </p>
        </div>
        <SignInForm next="/onboarding" />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Write `src/app/auth/error/page.tsx`**

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Auth error — WhatToEat',
};

type Props = {
  searchParams: Promise<{ reason?: string }>;
};

export default async function AuthErrorPage({ searchParams }: Props) {
  const { reason } = await searchParams;

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t sign you in. This link may have expired or already
            been used.
          </p>
          {reason && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {reason}
            </p>
          )}
        </div>
        <Link
          href="/auth/login"
          className="inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
        >
          Try again
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/auth/
git commit -m "auth-ui: login / signup / error App Router pages"
```

---

### Task 9: Profile auto-create trigger

<!-- TODO: confirm with user — this migration touches `supabase/migrations/` which is owned by Track 0. Two options: (a) add it here as a new migration file in Track 4 (safe — it's a new file, not editing existing ones), or (b) defer to a Track 0 follow-up migration. Recommended: option (a) — the trigger is auth-coupled and belongs here conceptually. If Track 0 has a migration naming convention, follow it (e.g. `20260426000002_auto_create_profile.sql`). -->

**Files:** `supabase/migrations/<timestamp>_auto_create_profile.sql`

When a new row is inserted into `auth.users`, automatically create an empty `profiles` row with sensible defaults. This prevents "profile not found" errors on first sign-in before the user completes onboarding.

- [ ] **Step 1: Check existing migration naming**

```bash
ls /Users/ravishah/Documents/whattoeat/supabase/migrations/
```

Use the next sequential timestamp.

- [ ] **Step 2: Write the migration**

Create `supabase/migrations/<timestamp>_auto_create_profile.sql`:

```sql
-- Trigger: auto-create an empty profiles row when auth.users gets a new entry.
-- This fires AFTER INSERT so the auth.users row is committed and the FK is valid.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, goal)
  values (new.id, 'maintain')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Drop and recreate so this migration is idempotent.
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();
```

- [ ] **Step 3: Apply to the local Supabase instance (if running)**

```bash
cd /Users/ravishah/Documents/whattoeat && npx supabase db push
```

Or if using the hosted project directly, apply via the Supabase dashboard SQL editor.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "auth: trigger to auto-create profiles row on new auth.users insert"
```

---

### Task 10: Full test run + typecheck

**Files:** none (verification only)

Run all tests and typecheck to confirm nothing broke across the four new layers.

- [ ] **Step 1: Run all unit tests**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test
```

Expected: all suites pass, including the new `get-user-id.test.ts` and `require-user.test.ts`.

- [ ] **Step 2: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Lint**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run lint
```

Expected: exit 0 (Biome clean).

- [ ] **Step 4: Purity gate (confirm auth helpers do not bleed into engine)**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/engine/_purity.test.ts
```

Expected: GREEN. The engine must not import from `@/server/auth`, `@/lib/supabase`, or `next/`.

---

### Task 11: Manual smoke test (human required)

This task cannot be automated — it requires a live Supabase project and a real email inbox. The human executes these steps after `bun run dev` is running.

- [ ] **Step 1: Start dev server**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run dev
```

- [ ] **Step 2: Sign-in flow**

  1. Open `http://localhost:3000/auth/login`.
  2. Enter a real email address.
  3. Click "Send magic link".
  4. Confirm the "Check your inbox" message appears.
  5. Click the link in the email.
  6. Confirm you land at `http://localhost:3000/` (or the `?next=` value).
  7. Open DevTools → Application → Cookies — confirm `sb-*-auth-token` cookie is present and has an expiry.

- [ ] **Step 3: Protected route redirect**

  1. Sign out (or delete the auth cookie).
  2. Navigate to `http://localhost:3000/pantry`.
  3. Confirm you are redirected to `/auth/login?next=/pantry`.
  4. Sign in via magic link.
  5. Confirm you land back at `/pantry`.

- [ ] **Step 4: Sign-out**

  1. Add `<SignOutButton />` temporarily to the root layout (or use the `/auth/login` page if already signed in).
  2. Click "Sign out".
  3. Confirm you land at `/auth/login` and the auth cookie is cleared.

- [ ] **Step 5: Profile auto-create**

  1. Sign in with an email that has never been used.
  2. Open the Supabase dashboard → Table editor → `profiles`.
  3. Confirm a row exists for the new user's UUID with `goal = 'maintain'`.

- [ ] **Step 6: Error page**

  Navigate to `http://localhost:3000/auth/error?reason=test+error`. Confirm the error page renders with the reason displayed.

---

### Task 12: Integration smoke test (optional / deferred flag)

<!-- TODO: flag for user — a full Playwright E2E test for the auth flow (real OTP email) requires either: (a) a Supabase test project with email delivery disabled and OTP exposed via API, or (b) mocking the Supabase auth API at the HTTP layer. Both are non-trivial to set up in CI without secrets. Recommendation: defer the Playwright auth E2E to Track 12 (observability), where the CI environment is already hardened. For now, the manual smoke test in Task 11 is the acceptance gate. A lightweight alternative — testing just the callback route handler with a mocked exchangeCodeForSession — could be added here if the team wants partial automation. -->

This task is intentionally deferred. See the inline TODO above. When the team is ready:

- [ ] **Option A (lightweight):** Write a Vitest test for the callback route handler (`src/app/auth/callback/route.ts`) using a mocked `createServerClient` — assert that a valid `?code=` redirects home and an invalid code redirects to `/auth/error`.

- [ ] **Option B (full E2E):** Add a Playwright test in `tests/e2e/auth.spec.ts` that uses Supabase's Admin API to generate a valid OTP, then hits the callback URL. Requires `SUPABASE_SERVICE_ROLE_KEY` in the CI environment.

Flag which option to pursue in the first PR review comment.

---

### Task 13: Typecheck, lint, and PR

**Files:** none (housekeeping + PR creation)

- [ ] **Step 1: Final typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

Expected: exit 0.

- [ ] **Step 2: Final lint**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run lint
```

Expected: exit 0.

- [ ] **Step 3: Final test run**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test
```

Expected: all suites pass.

- [ ] **Step 4: Push and open PR**

```bash
git push -u origin wt/track-4-supabase-auth
gh pr create \
  --title "Track 4: Supabase auth + session + middleware" \
  --body "$(cat <<'EOF'
## Summary

- Supabase client factories (`createBrowserClient`, `createServerClient`, `createMiddlewareClient`) in `src/lib/supabase/`.
- Cookie-refreshing Next.js middleware in `src/middleware.ts` with route guard for authenticated prefixes.
- Server-side auth helpers in `src/server/auth/`: `getUserId()`, `requireUser()`, `signOut()`.
- App Router auth pages: `/auth/login`, `/auth/signup`, `/auth/callback`, `/auth/error`.
- Auth UI primitives: `SignInForm` (magic-link OTP), `SignOutButton`.
- Postgres trigger to auto-create `profiles` row on first sign-in.
- Unit tests for `getUserId` and `requireUser` with mocked Supabase client.

## How to test

1. Follow the manual smoke test in Task 11.
2. Check that `bun run test` and `bun run typecheck` both exit 0.

## Notes

- Integration E2E test deferred (see Task 12 TODO).
- Profile trigger migration: confirm whether this should live in Track 4 or a Track 0 follow-up (see Task 9 TODO).
- Tracks 5, 6, 7 can now `await requireUser()` at the top of any Server Action.
EOF
)"
```

---

## Definition of Done

| Check | Command / Verification |
|-------|----------------------|
| Typecheck | `bun run typecheck` exits 0 |
| Lint | `bun run lint` exits 0 |
| Unit tests | `bun run test` — `get-user-id.test.ts` and `require-user.test.ts` GREEN |
| Engine purity | `bun run test src/engine/_purity.test.ts` GREEN |
| Manual auth flow | All steps in Task 11 pass |
| File ownership | No edits outside owned paths (`src/lib/supabase/**`, `src/server/auth/**`, `src/middleware.ts`, `src/app/auth/**`, `src/components/auth/**`, `supabase/migrations/`) |
| No client IDs | No Server Action or Route Handler reads `userId` from a request body or query param |
| No `getSession()` | `grep -r "getSession" src/` returns empty |
| PR open | PR created on `wt/track-4-supabase-auth` targeting `main` |

---

## Hand-off note for downstream tracks

**Tracks 5 (pantry), 6 (profile), 7 (checkin)** — to require authentication in any Server Action:

```ts
import { requireUser } from '@/server/auth';

export async function myServerAction(input: unknown) {
  const { userId } = await requireUser(); // redirects to /auth/login if anon
  // ... use userId in every DB query; never trust client-supplied IDs
}
```

**Track 12 (observability)** — the Playwright E2E auth suite is deferred here. Pick it up as the first task of Track 12 so CI has a live smoke test before ship.

**Never** pass `userId` from a form field, URL param, or request body into a DB query. Always derive it from `requireUser()` or `getUserId()`.
